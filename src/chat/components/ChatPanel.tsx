import { Thread } from "@assistant-ui/react-ui";
import { WELCOME_MESSAGE, WELCOME_SUGGESTIONS } from "../defaults";

type ChatPanelProps = {
  isOpen: boolean;
  assistantName: string;
  title: string;
  statusText: string;
  onClose: () => void;
};

export function ChatPanel(props: ChatPanelProps) {
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
          <h2>{props.title}</h2>
          <p className="chat-panel__status" aria-live="polite">
            <span className="status-dot" aria-hidden="true" />
            {props.statusText}
          </p>
        </div>

        <button
          type="button"
          className="icon-button"
          onClick={props.onClose}
          aria-label="Close chat"
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <div className="chat-panel__body chat-panel__body--thread">
        <Thread
          welcome={{
            message: WELCOME_MESSAGE,
            suggestions: [
              { prompt: WELCOME_SUGGESTIONS[0] },
              { prompt: WELCOME_SUGGESTIONS[1] },
              { prompt: WELCOME_SUGGESTIONS[2] },
            ],
          }}
        />
      </div>
    </div>
  );
}
