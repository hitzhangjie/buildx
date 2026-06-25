import { useState, useEffect, useRef, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";
import { FormFeedbackPanel } from "./FormFeedbackPanel";
import "./ConfirmModal.css";

export type ConfirmModalProps = {
  message: string;
  confirmInput?: string;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * ConfirmModal — matches OneDev's ConfirmModalPanel / ContentPanel.html.
 *
 * Renders a modal backdrop with a centered card containing:
 * - Header: "Please Confirm" title + close button
 * - Body:   HTML message, optional feedback, optional confirm-input field
 * - Footer: OK (submit) + Cancel buttons
 *
 * When confirmInput is set, the user must type that exact string before OK
 * becomes enabled. Uses a React portal to render at document body level.
 */
export function ConfirmModal({
  message,
  confirmInput,
  error,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const okEnabled = !confirmInput || inputValue === confirmInput;

  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  // Focus the confirm input on mount
  useEffect(() => {
    if (confirmInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [confirmInput]);

  // Close on Escape (OneDev confirm modal uses static backdrop; Escape still closes)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (okEnabled) onConfirm();
  }

  return createPortal(
    <>
      <div className="modal-backdrop fade show confirm-modal-backdrop" />
      <div
        className="modal fade show confirm-modal"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="confirm">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">Please Confirm</h5>
                  <button type="button" className="close" onClick={onCancel} aria-label="Close">
                    <Icon name="times" />
                  </button>
                </div>
                <div className="modal-body">
                  <div className="message" dangerouslySetInnerHTML={{ __html: message }} />
                  <FormFeedbackPanel messages={error ? [error] : []} />
                  {confirmInput && (
                    <input
                      ref={inputRef}
                      className="form-control confirm"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                    />
                  )}
                </div>
                <div className="modal-footer">
                  <input
                    type="submit"
                    className="btn btn-primary"
                    value="Ok"
                    disabled={!okEnabled}
                  />
                  <a
                    className="btn btn-secondary"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onCancel();
                    }}
                  >
                    Cancel
                  </a>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
