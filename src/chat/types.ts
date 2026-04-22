import type { OpenAIResponsesAdapterOptions } from "./adapter/types";

export type ChatWidgetProps = OpenAIResponsesAdapterOptions & {
  assistantName?: string;
  title?: string;
  statusText?: string;
  launcherText?: string;
  initiallyOpen?: boolean;
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
