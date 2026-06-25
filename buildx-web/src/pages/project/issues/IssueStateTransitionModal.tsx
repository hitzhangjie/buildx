import { useCallback, useEffect, useRef, useState } from "react";
import { transitionIssueState } from "../../../api/issues";
import type { GlobalIssueSetting } from "../../../api/issueSettings";

export interface IssueStateTransitionModalProps {
  issueId: number;
  currentState: string;
  targetState: string;
  issueSetting: GlobalIssueSetting;
  onClose: () => void;
  onTransited: () => void;
}

/**
 * Modal dialog for transitioning issue state.
 * Mirrors OneDev TransitionOptionPanel — shown after selecting a target state
 * from the dropdown menu (TransitionMenuLink).
 *
 * Reference: references/onedev/.../web/component/issue/transitionoption/TransitionOptionPanel.java
 * Reference: references/onedev/.../web/component/issue/transitionoption/TransitionOptionPanel.html
 */
export function IssueStateTransitionModal({
  issueId,
  currentState,
  targetState,
  issueSetting: _issueSetting,
  onClose,
  onTransited,
}: IssueStateTransitionModalProps) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      await transitionIssueState(issueId, targetState, comment.trim() || undefined);
      onTransited();
      onClose();
    } catch (err) {
      setError((err as { message?: string }).message ?? "Failed to transition state");
      setSubmitting(false);
    }
  }, [targetState, comment, issueId, onTransited, onClose]);

  const modalTitle = `Issue Transition (${currentState} → ${targetState})`;

  return (
    <div
      className="modal show d-block"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 1050,
        overflowY: "auto",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
      }}
      ref={backdropRef}
      onClick={handleBackdropClick}
    >
      <div
        className="modal-dialog transition-option"
        style={{
          position: "relative",
          maxWidth: 540,
          width: "100%",
          margin: "1.75rem auto",
        }}
      >
        <div
          className="modal-content"
          style={{
            backgroundColor: "#fff",
            borderRadius: "0.3rem",
            boxShadow: "0 0.5rem 1rem rgba(0, 0, 0, 0.15)",
          }}
        >
          {/* Header — matches OneDev TransitionOptionPanel header */}
          <div
            className="modal-header"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1rem 1.5rem",
              borderBottom: "1px solid #dee2e6",
            }}
          >
            <h5 className="modal-title">{modalTitle}</h5>
            <button
              type="button"
              className="close"
              onClick={onClose}
              style={{
                border: "none",
                background: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                padding: 0,
                lineHeight: 1,
              }}
            >
              &times;
            </button>
          </div>
          {/* Body — comment input only, matches OneDev */}
          <div className="modal-body" style={{ padding: "1.25rem 1.5rem" }}>
            {error && (
              <div className="alert alert-danger py-2" role="alert">
                {error}
              </div>
            )}
            <div>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Leave a comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
          {/* Footer — matches OneDev */}
          <div
            className="modal-footer"
            style={{
              display: "flex",
              justifyContent: "flex-end",
              padding: "1rem 1.5rem",
              borderTop: "1px solid #dee2e6",
            }}
          >
            <button
              type="button"
              className="btn btn-primary"
              disabled={submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? "Transitioning..." : "Ok"}
            </button>
            <button type="button" className="btn btn-secondary ml-2" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
