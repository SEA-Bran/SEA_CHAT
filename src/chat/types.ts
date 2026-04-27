import type { OpenAIResponsesAdapterOptions } from "./adapter/types";

export type ChatWidgetProps = OpenAIResponsesAdapterOptions & {
  assistantName?: string;
  title?: string;
  statusText?: string;
  showClearHistoryButton?: boolean;
  launcherText?: string;
  initiallyOpen?: boolean;
  historyTtlHours?: number;
  historyStorageKey?: string;
};

export type WidgetTarget = string | HTMLElement;

export type SeaChatWidgetOptions = ChatWidgetProps & {
  target?: WidgetTarget;
};

export type SeaChatWidgetInstance = {
  destroy: () => void;
};

export type SeaChatWidgetApi = {
  init: (options?: SeaChatWidgetOptions) => SeaChatWidgetInstance;
};
