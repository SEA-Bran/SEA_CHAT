import type { ChatWidgetProps } from "./types";

export const DEFAULT_WIDGET_PROPS: Required<
  Pick<
    ChatWidgetProps,
    | "assistantName"
    | "title"
    | "statusText"
    | "launcherText"
    | "initiallyOpen"
    | "historyTtlHours"
  >
> = {
  assistantName: "SEA Assistant",
  title: "Chat with us",
  statusText: "Online now",
  launcherText: "Chat with SEA",
  initiallyOpen: false,
  historyTtlHours: 24,
};

export const WELCOME_MESSAGE = "Ask about pricing, support, or onboarding.";

export const WELCOME_SUGGESTIONS = [
  "What can you help me with today?",
  "Show me pricing and package options.",
  "I need support with onboarding.",
];
