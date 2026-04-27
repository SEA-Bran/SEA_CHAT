import type {
  MessageHistory,
  OpenAIResponsesAdapterOptions,
  ResettableChatModelAdapter,
} from "./types";
import { runEndpointRequest } from "./runEndpointRequest";
import { runOpenAIRequest } from "./runOpenAIRequest";

export type { OpenAIResponsesAdapterOptions } from "./types";

// Maximum conversation history to keep on client. Server can maintain its own state
// via previous_response_id, so we only keep recent turns as a fallback.
const MAX_HISTORY_LENGTH = 10;

export function createOpenAIResponsesAdapter(
  options: OpenAIResponsesAdapterOptions,
): ResettableChatModelAdapter {
  // "const" = these values are set once, never replaced
  const fallbackErrorMessage =
    options.fallbackErrorMessage ??
    "Sorry, the assistant could not be reached. Please try again.";

  // Keeps track of the previous OpenAI response ID for multi-turn conversations
  // (OpenAI uses this to remember what was said before)
  const state = {
    previousResponseId: null as string | null,
  };

  // Clears the conversation memory so the next message starts fresh
  function reset() {
    state.previousResponseId = null;
  }

  // The adapter is the bridge between the chat UI and the API
  // @assistant-ui/react calls adapter.run() every time the user sends a message
  const adapter: ResettableChatModelAdapter = {
    reset: reset,

    async run(args) {
      // Find the last thing the user typed
      const lastUserMessage = [...args.messages]
        .reverse()
        .find(function (message) {
          return message.role === "user";
        });

      // "let" = userText starts empty and may be filled in below
      let userText = "";

      if (lastUserMessage) {
        // Join all the text parts of the message into one string
        userText = lastUserMessage.content
          .map(function (part) {
            if (part.type === "text") {
              return part.text;
            }

            return "";
          })
          .join("");
      }

      // Build a simple list of { role, text } for the full conversation history
      const history: MessageHistory = args.messages.map(function (message) {
        return {
          role: message.role,
          text: message.content
            .map(function (part) {
              if (part.type === "text") {
                return part.text;
              }

              return "";
            })
            .join(""),
        };
      });

      try {
        // Priority 1: Use the custom endpoint URL if one was provided
        if (options.endpointUrl) {
          const endpointText = await runEndpointRequest(
            options,
            userText,
            history.slice(-MAX_HISTORY_LENGTH),
            args.abortSignal,
            state,
          );

          return {
            content: [{ type: "text", text: endpointText }],
          };
        }

        // Priority 2: Call OpenAI directly if an API key was provided
        if (options.openaiApiKey) {
          const openAIText = await runOpenAIRequest(
            options,
            userText,
            args.abortSignal,
            state,
          );

          return {
            content: [{ type: "text", text: openAIText }],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: "Widget not configured. Provide endpointUrl or openaiApiKey in SeaChatWidget.init().",
            },
          ],
        };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.toLowerCase().includes("abort")
        ) {
          throw error;
        }

        // "let" = we may add more detail to the error message below
        let errorText = fallbackErrorMessage;

        if (error instanceof Error) {
          errorText += " (" + error.message + ")";
        }

        return {
          content: [{ type: "text", text: errorText }],
        };
      }
    },
  };

  return adapter;
}
