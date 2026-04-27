import {
  Thread,
  AssistantMessage,
  BranchPicker,
  AssistantActionBar,
} from "@assistant-ui/react-ui";
import { BotMessageSquare } from "lucide-react";
import type { FC } from "react";
import { WELCOME_MESSAGE, WELCOME_SUGGESTIONS } from "../defaults";

/**
 * Custom AssistantMessage that swaps the default "A" fallback avatar
 * for a BotMessageSquare icon from lucide-react.
 */
const BotAssistantMessage: FC = () => (
  <AssistantMessage.Root>
    <div className="aui-avatar-root aui-assistant-avatar">
      <div className="aui-avatar-fallback">
        <BotMessageSquare size={20} aria-hidden="true" />
      </div>
    </div>
    <AssistantMessage.Content />
    <BranchPicker />
    <AssistantActionBar />
  </AssistantMessage.Root>
);

type ChatPanelProps = {
  isOpen: boolean;
  assistantName: string;
  title?: string;
  statusText?: string;
  onClose: () => void;
};

export function ChatPanel(props: ChatPanelProps) {
  const title = props.title?.trim();
  const statusText = props.statusText?.trim();

  // "let" because this value will change — we add a class when the chat is open
  let panelClassName = "chat-panel";

  // When the chat is open, add the --open class so CSS makes it visible
  if (props.isOpen) {
    panelClassName += " chat-panel--open";
  }

  return (
    <div className={panelClassName}>
      <header className="chat-panel__header">
        <div>
          <p className="chat-panel__label">{props.assistantName}</p>
          {title ? <h2>{title}</h2> : null}
          {statusText ? (
            <p className="chat-panel__status" aria-live="polite">
              <span className="status-dot" aria-hidden="true" />
              {statusText}
            </p>
          ) : null}
        </div>

        <div className="chat-panel__actions">
          <button
            type="button"
            className="icon-button"
            onClick={props.onClose}
            aria-label="Close chat"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </header>

      <div className="chat-panel__body chat-panel__body--thread">
        <Thread
          components={{
            AssistantMessage: BotAssistantMessage,
          }}
          welcome={{
            message: WELCOME_MESSAGE,
            suggestions: [
              { prompt: WELCOME_SUGGESTIONS[0] },
              { prompt: WELCOME_SUGGESTIONS[1] },
              { prompt: WELCOME_SUGGESTIONS[2] },
            ],
          }}
          userMessage={{
            allowEdit: true,
          }}
          assistantMessage={{
            allowReload: true,
            allowCopy: true,
            allowSpeak: false,
            allowFeedbackPositive: false,
            allowFeedbackNegative: false,
          }}
          composer={{
            allowAttachments: false,
          }}
          strings={{
            composer: {
              input: {
                placeholder: "Type your message...",
              },
              send: {
                tooltip: "Send message",
              },
              cancel: {
                tooltip: "Stop response",
              },
            },
            userMessage: {
              edit: {
                tooltip: "Edit this message",
              },
            },
            assistantMessage: {
              reload: {
                tooltip: "Regenerate response",
              },
              copy: {
                tooltip: "Copy response",
              },
            },
          }}
        />
      </div>
    </div>
  );
}
