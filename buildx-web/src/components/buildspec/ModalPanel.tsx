import { createPortal } from "react-dom";
import { useEffect, type ReactNode } from "react";
import { Icon } from "../onedev/Icon";
import "../onedev/ConfirmModal.css";

type ModalPanelProps = {
  title: string;
  description?: string;
  children: ReactNode;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
};

/** Generic modal matching OneDev ModalPanel / step edit modal layout. */
export function ModalPanel({
  title,
  description,
  children,
  onSave,
  onCancel,
  saveLabel = "OK",
}: ModalPanelProps) {
  useEffect(() => {
    document.body.classList.add("modal-open");
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCancel();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", onKey);
    };
  }, [onCancel]);

  return createPortal(
    <>
      <div className="modal-backdrop fade show confirm-modal-backdrop" onClick={onCancel} />
      <div className="modal fade show confirm-modal" tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="close" onClick={onCancel} aria-label="Close">
                <Icon name="times" />
              </button>
            </div>
            <div className="modal-body">
              {description ? (
                <div
                  className="text-muted mb-3"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              ) : null}
              {children}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary dirty-aware" onClick={onSave}>
                {saveLabel}
              </button>
              <button type="button" className="btn btn-light" onClick={onCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
