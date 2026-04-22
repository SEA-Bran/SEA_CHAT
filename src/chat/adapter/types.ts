import type { ChatModelAdapter } from "@assistant-ui/react";

export type OpenAIDirectOptions = {
  openaiApiKey?: string;
  model?: string;
  instructions?: string;
  vectorStoreId?: string;
};

export type EndpointOptions = {
  endpointUrl?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  authKey?: string;
  authValue?: string;
  body?: unknown;
  apiKey?: string;
  userRole?: string;
  model?: string;
  useCustomEndpointRequest?: boolean;
  responsePath?: string;
  fallbackErrorMessage?: string;
};

export type OpenAIResponsesAdapterOptions = OpenAIDirectOptions &
  EndpointOptions;

export type MessageHistoryItem = {
  role: string;
  text: string;
};

export type MessageHistory = MessageHistoryItem[];

export type ResettableChatModelAdapter = ChatModelAdapter & {
  reset: () => void;
};
