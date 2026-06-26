import { createPortal } from "react-dom";
import { useEffect, type ReactNode } from "react";
import { Icon } from "../onedev/Icon";
import "../onedev/ConfirmModal.css";

type ModalPanelProps = {
  title?: string;
  /** Custom modal title content (e.g. step type selector dropdown in header). */
  header?: ReactNode;
  description?: string;
  descriptionClassName?: string;
  children: ReactNode;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
  hideFooter?: boolean;
};

/** Generic modal matching OneDev ModalPanel / step edit modal layout. */
export function ModalPanel({
  title,
  header,
  description,
  descriptionClassName = "text-muted mb-3",
  children,
  onSave,
  onCancel,
  saveLabel = "Save",
  hideFooter = false,
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
              <h5 className="modal-title">{header ?? title}</h5>
              <button type="button" className="close" onClick={onCancel} aria-label="Close">
                <Icon name="times" />
              </button>
            </div>
            <div className="modal-body">
              {description ? (
                <div
                  className={descriptionClassName}
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              ) : null}
              {children}
            </div>
            <div className="modal-footer">
              {!hideFooter ? (
                <>
                  <button type="button" className="btn btn-primary dirty-aware" onClick={onSave}>
                    {saveLabel}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={onCancel}>
                    Cancel
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
