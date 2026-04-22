import { useState, useMemo } from "react";
import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import { DEFAULT_WIDGET_PROPS } from "./defaults";
import { createOpenAIResponsesAdapter } from "./adapter/createOpenAIResponsesAdapter";
import { ChatLauncher } from "./components/ChatLauncher";
import { ChatPanel } from "./components/ChatPanel";
import type { ChatWidgetProps } from "./types";

export function ChatWidget(props: ChatWidgetProps) {
  // Use the value from props if provided, otherwise fall back to the defaults
  // "const" = these values are set once and never change
  const assistantName =
    props.assistantName ?? DEFAULT_WIDGET_PROPS.assistantName;
  const title = props.title ?? DEFAULT_WIDGET_PROPS.title;
  const statusText = props.statusText ?? DEFAULT_WIDGET_PROPS.statusText;
  const launcherText = props.launcherText ?? DEFAULT_WIDGET_PROPS.launcherText;
  const initiallyOpen =
    props.initiallyOpen ?? DEFAULT_WIDGET_PROPS.initiallyOpen;

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

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <section
        className="sea-chat-widget widget-layer"
        aria-label="Chat widget"
      >
        <ChatPanel
          isOpen={isOpen}
          assistantName={assistantName}
          title={title}
          statusText={statusText}
          onClose={handleClose}
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
