import { useEffect, useMemo, useState } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  useThread,
  useThreadRuntime,
} from "@assistant-ui/react";
import type { ThreadMessage, ThreadMessageLike } from "@assistant-ui/core";
import { gzip, ungzip } from "pako";
import { DEFAULT_WIDGET_PROPS } from "./defaults";
import { createOpenAIResponsesAdapter } from "./adapter/createOpenAIResponsesAdapter";
import { ChatLauncher } from "./components/ChatLauncher";
import { ChatPanel } from "./components/ChatPanel";
import type { ChatWidgetProps } from "./types";

type PersistedHistoryMessage = {
  role: ThreadMessageLike["role"];
  text: string;
  createdAt: string;
};

type CompressedHistoryRole = "a" | "u" | "s";

type PersistedHistoryPayload = {
  version: 1;
  expiresAt: number;
  messages: PersistedHistoryMessage[];
};

type CompactPersistedHistoryPayload = {
  v: 2;
  e: number;
  m: [CompressedHistoryRole, string][];
};

const COMPRESSED_HISTORY_PREFIX = "gz:";
const JSON_HISTORY_PREFIX = "j:";

function toCompressedHistoryRole(
  role: PersistedHistoryMessage["role"],
): CompressedHistoryRole {
  if (role === "assistant") {
    return "a";
  }

  if (role === "system") {
    return "s";
  }

  return "u";
}

function fromCompressedHistoryRole(
  role: CompressedHistoryRole,
): ThreadMessageLike["role"] {
  if (role === "a") {
    return "assistant";
  }

  if (role === "s") {
    return "system";
  }

  return "user";
}

function uint8ArrayToBase64(bytes: Uint8Array) {
  let binary = "";

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0);
  }

  return btoa(binary);
}

function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function gzipString(value: string) {
  return uint8ArrayToBase64(gzip(value));
}

async function gunzipString(value: string) {
  return new TextDecoder().decode(ungzip(base64ToUint8Array(value)));
}

function serializePersistedHistory(payload: CompactPersistedHistoryPayload) {
  return JSON.stringify(payload);
}

function toCompactPersistedHistoryPayload(
  expiresAt: number,
  messages: readonly PersistedHistoryMessage[],
): CompactPersistedHistoryPayload {
  return {
    v: 2,
    e: expiresAt,
    m: messages.map(function (message) {
      return [toCompressedHistoryRole(message.role), message.text];
    }),
  };
}

function fromCompactPersistedHistoryPayload(
  payload: CompactPersistedHistoryPayload,
): readonly ThreadMessageLike[] | null {
  if (
    payload.v !== 2 ||
    typeof payload.e !== "number" ||
    !Array.isArray(payload.m)
  ) {
    return null;
  }

  if (payload.e <= Date.now()) {
    return [];
  }

  return payload.m
    .filter(function (message) {
      return (
        Array.isArray(message) &&
        message.length === 2 &&
        (message[0] === "a" || message[0] === "u" || message[0] === "s") &&
        typeof message[1] === "string" &&
        message[1].trim().length > 0
      );
    })
    .map(function (message) {
      return {
        role: fromCompressedHistoryRole(message[0]),
        content: message[1],
      };
    });
}

function buildHistoryStorageKey(props: ChatWidgetProps, assistantName: string) {
  if (props.historyStorageKey) {
    return props.historyStorageKey;
  }

  const scope =
    props.endpointUrl ?? props.model ?? props.vectorStoreId ?? assistantName;

  return "sea-chat-history:" + scope;
}

function clearPersistedHistory(storageKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(storageKey);
}

async function restorePersistedHistory(
  storageKey: string,
): Promise<readonly ThreadMessageLike[] | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(storageKey);

  if (!rawValue) {
    return null;
  }

  try {
    if (rawValue.startsWith(COMPRESSED_HISTORY_PREFIX)) {
      const compressedPayload = await gunzipString(
        rawValue.slice(COMPRESSED_HISTORY_PREFIX.length),
      );
      const payload = JSON.parse(
        compressedPayload,
      ) as CompactPersistedHistoryPayload;
      const restoredMessages = fromCompactPersistedHistoryPayload(payload);

      if (restoredMessages === null) {
        clearPersistedHistory(storageKey);
        return null;
      }

      if (restoredMessages.length === 0) {
        clearPersistedHistory(storageKey);
        return null;
      }

      return restoredMessages;
    }

    if (rawValue.startsWith(JSON_HISTORY_PREFIX)) {
      const payload = JSON.parse(
        rawValue.slice(JSON_HISTORY_PREFIX.length),
      ) as CompactPersistedHistoryPayload;
      const restoredMessages = fromCompactPersistedHistoryPayload(payload);

      if (restoredMessages === null) {
        clearPersistedHistory(storageKey);
        return null;
      }

      if (restoredMessages.length === 0) {
        clearPersistedHistory(storageKey);
        return null;
      }

      return restoredMessages;
    }

    const payload = JSON.parse(rawValue) as PersistedHistoryPayload;

    if (
      payload.version !== 1 ||
      !Array.isArray(payload.messages) ||
      typeof payload.expiresAt !== "number"
    ) {
      clearPersistedHistory(storageKey);
      return null;
    }

    if (payload.expiresAt <= Date.now()) {
      clearPersistedHistory(storageKey);
      return null;
    }

    return payload.messages
      .filter(function (message) {
        return (
          (message.role === "assistant" ||
            message.role === "user" ||
            message.role === "system") &&
          typeof message.text === "string" &&
          message.text.trim().length > 0
        );
      })
      .map(function (message) {
        return {
          role: message.role,
          content: message.text,
          createdAt: new Date(message.createdAt),
        };
      });
  } catch {
    clearPersistedHistory(storageKey);
    return null;
  }
}

async function persistHistory(
  storageKey: string,
  historyTtlHours: number,
  messages: readonly PersistedHistoryMessage[],
) {
  if (typeof window === "undefined") {
    return;
  }

  if (messages.length === 0) {
    clearPersistedHistory(storageKey);
    return;
  }

  const ttlInMilliseconds = Math.max(historyTtlHours, 0) * 60 * 60 * 1000;

  if (ttlInMilliseconds === 0) {
    clearPersistedHistory(storageKey);
    return;
  }

  const compactPayload = toCompactPersistedHistoryPayload(
    Date.now() + ttlInMilliseconds,
    messages,
  );
  const serializedPayload = serializePersistedHistory(compactPayload);

  const compressedPayload = await gzipString(serializedPayload);
  window.localStorage.setItem(
    storageKey,
    COMPRESSED_HISTORY_PREFIX + compressedPayload,
  );

  if (compressedPayload.length <= serializedPayload.length) {
    return;
  }

  window.localStorage.setItem(
    storageKey,
    JSON_HISTORY_PREFIX + serializedPayload,
  );
}

function toPersistedHistoryMessage(
  message: ThreadMessage,
): PersistedHistoryMessage | null {
  const text = message.content
    .map(function (part) {
      if (part.type === "text") {
        return part.text;
      }

      return "";
    })
    .join("")
    .trim();

  if (text.length === 0) {
    return null;
  }

  return {
    role: message.role,
    text: text,
    createdAt: message.createdAt.toISOString(),
  };
}

type ChatHistorySyncProps = {
  adapter: {
    reset: () => void;
  };
  storageKey: string;
  historyTtlHours: number;
};

function ChatHistorySync(props: ChatHistorySyncProps) {
  const threadRuntime = useThreadRuntime();
  const messages = useThread(function (state) {
    return state.messages;
  });
  const [isReadyToPersist, setIsReadyToPersist] = useState(false);

  useEffect(
    function () {
      let isCancelled = false;

      async function syncFromStorage() {
        const restoredMessages = await restorePersistedHistory(
          props.storageKey,
        );

        if (isCancelled) {
          return;
        }

        if (restoredMessages && restoredMessages.length > 0) {
          props.adapter.reset();
          threadRuntime.reset(restoredMessages);
        }

        setIsReadyToPersist(true);
      }

      void syncFromStorage();

      return function () {
        isCancelled = true;
      };
    },
    [props.adapter, props.storageKey, threadRuntime],
  );

  useEffect(
    function () {
      if (!isReadyToPersist) {
        return;
      }

      const persistedMessages = messages
        .map(toPersistedHistoryMessage)
        .filter(function (message): message is PersistedHistoryMessage {
          return message !== null;
        });

      void persistHistory(
        props.storageKey,
        props.historyTtlHours,
        persistedMessages,
      );
    },
    [props.historyTtlHours, props.storageKey, messages, isReadyToPersist],
  );

  return null;
}

export function ChatWidget(props: ChatWidgetProps) {
  // Use the value from props if provided, otherwise fall back to the defaults
  // "const" = these values are set once and never change
  const assistantName =
    props.assistantName ?? DEFAULT_WIDGET_PROPS.assistantName;
  const title = props.title?.trim();
  const statusText = props.statusText ?? DEFAULT_WIDGET_PROPS.statusText;
  const showClearHistoryButton = props.showClearHistoryButton === true;
  const launcherText = props.launcherText ?? DEFAULT_WIDGET_PROPS.launcherText;
  const initiallyOpen =
    props.initiallyOpen ?? DEFAULT_WIDGET_PROPS.initiallyOpen;
  const historyTtlHours =
    props.historyTtlHours ?? DEFAULT_WIDGET_PROPS.historyTtlHours;
  const historyStorageKey = buildHistoryStorageKey(props, assistantName);

  // isOpen = is the chat box currently visible?
  // setIsOpen = the function we call to show or hide it
  // useState = React remembers this value even when the component re-renders
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  // -------------------------------------------------------------------------
  // IMPORTANT: We use useMemo with [] here, NOT a plain variable.
  //
  // Why? Every time React re-renders this component (e.g. when the chat opens
  // or a message arrives), any plain variable gets recreated from scratch.
  // That would reset "previousResponseId" to null on every render, which
  // means OpenAI would forget the conversation history after each message —
  // breaking multi-turn chat.
  //
  // useMemo with [] runs the function only ONCE for the lifetime of the widget
  // and reuses the same adapter object on every re-render, so
  // "previousResponseId" is preserved between messages.
  // -------------------------------------------------------------------------
  const adapter = useMemo(
    () =>
      createOpenAIResponsesAdapter({
        endpointUrl: props.endpointUrl,
        method: props.method,
        headers: props.headers,
        authKey: props.authKey,
        authValue: props.authValue,
        body: props.body,
        apiKey: props.apiKey,
        vectorStoreIds: props.vectorStoreIds,
        useCustomEndpointRequest: props.useCustomEndpointRequest,
        responsePath: props.responsePath,
        fallbackErrorMessage: props.fallbackErrorMessage,
        openaiApiKey: props.openaiApiKey,
        model: props.model,
        instructions: props.instructions,
        vectorStoreId: props.vectorStoreId,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [], // Empty array = create once, never recreate
  );

  // Connect the adapter to the @assistant-ui/react library so it can run our adapter
  const runtime = useLocalRuntime(adapter);

  function handleClose() {
    setIsOpen(false);
  }

  function handleToggle() {
    setIsOpen(!isOpen);
  }

  function handleHistoryCleared() {
    clearPersistedHistory(historyStorageKey);
    adapter.reset();
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatHistorySync
        adapter={adapter}
        storageKey={historyStorageKey}
        historyTtlHours={historyTtlHours}
      />
      <section
        className="sea-chat-widget widget-layer"
        aria-label="Chat widget"
      >
        <ChatPanel
          isOpen={isOpen}
          assistantName={assistantName}
          title={title}
          statusText={statusText}
          showClearHistoryButton={showClearHistoryButton}
          onClose={handleClose}
          onClearHistory={handleHistoryCleared}
        />

        <ChatLauncher
          isOpen={isOpen}
          launcherText={launcherText}
          onToggle={handleToggle}
        />
      </section>
    </AssistantRuntimeProvider>
  );
}
