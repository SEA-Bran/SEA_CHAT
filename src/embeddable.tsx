import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ChatWidget } from "./chat/ChatWidget";
import type {
  SeaChatWidgetApi,
  SeaChatWidgetInstance,
  SeaChatWidgetOptions,
  WidgetTarget,
} from "./chat/types";
import widgetStyles from "./widget.css?inline";
import assistantUiStyles from "@assistant-ui/react-ui/styles/index.css?inline";
import assistantUiTheme from "@assistant-ui/react-ui/styles/themes/default.css?inline";

declare global {
  interface Window {
    SeaChatWidget?: SeaChatWidgetApi;
  }
}

function resolveMountTarget(target?: WidgetTarget): HTMLElement {
  if (!target) {
    return document.body;
  }

  if (typeof target === "string") {
    const selected = document.querySelector<HTMLElement>(target);
    if (!selected) {
      throw new Error(`SeaChatWidget: target selector not found: ${target}`);
    }
    return selected;
  }

  return target;
}

function init(options: SeaChatWidgetOptions = {}): SeaChatWidgetInstance {
  const mountTarget = resolveMountTarget(options.target);
  const host = document.createElement("div");
  host.setAttribute("data-sea-chat-widget", "true");
  mountTarget.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: "open" });

  const styleTag = document.createElement("style");
  // Replace :root with :host so CSS custom properties apply inside Shadow DOM.
  const themedStyles = assistantUiTheme.replace(/:root\b/g, ":host");
  styleTag.textContent =
    themedStyles + "\n" + assistantUiStyles + "\n" + widgetStyles;

  const reactMountNode = document.createElement("div");
  shadowRoot.append(styleTag, reactMountNode);

  let root: Root | null = createRoot(reactMountNode);
  const widgetProps = {
    assistantName: options.assistantName,
    title: options.title,
    statusText: options.statusText,
    launcherText: options.launcherText,
    initiallyOpen: options.initiallyOpen,
    historyTtlHours: options.historyTtlHours,
    historyStorageKey: options.historyStorageKey,
    endpointUrl: options.endpointUrl,
    method: options.method,
    headers: options.headers,
    authKey: options.authKey,
    authValue: options.authValue,
    body: options.body,
    apiKey: options.apiKey,
    vectorStoreIds: options.vectorStoreIds,
    useCustomEndpointRequest: options.useCustomEndpointRequest,
    responsePath: options.responsePath,
    fallbackErrorMessage: options.fallbackErrorMessage,
    openaiApiKey: options.openaiApiKey,
    model: options.model,
    instructions: options.instructions,
    vectorStoreId: options.vectorStoreId,
  };

  root.render(
    <StrictMode>
      <ChatWidget {...widgetProps} />
    </StrictMode>,
  );

  return {
    destroy() {
      if (root) {
        root.unmount();
        root = null;
      }
      host.remove();
    },
  };
}

const SeaChatWidget: SeaChatWidgetApi = {
  init,
};

if (typeof window !== "undefined") {
  window.SeaChatWidget = SeaChatWidget;
}
