import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import "./search-modal.css";

export type SearchModalProps = {
  onClose: () => void;
  children: ReactNode;
};

/**
 * SearchModal — matches OneDev/Bootstrap modal layout.
 * Backdrop and .modal are siblings on document.body (not nested).
 */
export function SearchModal({ onClose, children }: SearchModalProps) {
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  const handleModalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <>
      <div className="modal-backdrop fade show search-modal-backdrop" />
      <div
        className="modal fade show search-modal"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        onClick={handleModalClick}
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content">{children}</div>
        </div>
      </div>
    </>,
    document.body,
  );
}
