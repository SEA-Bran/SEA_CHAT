type ChatLauncherProps = {
  isOpen: boolean;
  launcherText: string;
  onToggle: () => void;
};

export function ChatLauncher(props: ChatLauncherProps) {
  // "let" because this value will change — we add a class when the chat is open
  let buttonClassName = "launcher";

  // When the chat is open, add the --active class so the button looks pressed
  if (props.isOpen) {
    buttonClassName += " launcher--active";
  }

  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={props.onToggle}
      aria-expanded={props.isOpen}
    >
      <span className="launcher__icon" aria-hidden="true">
        {props.isOpen ? "−" : "✦"}
      </span>
      <span className="launcher__text">{props.launcherText}</span>
      <span className="launcher__badge" aria-hidden="true" />
    </button>
  );
}
