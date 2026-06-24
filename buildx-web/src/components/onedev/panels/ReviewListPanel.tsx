import { Icon } from "../Icon";
import type { PullRequestReview } from "../../../api/pullRequests";

const REVIEW_STATUS_ICON: Record<string, { name: string; className: string; title: string }> = {
  PENDING: { name: "clock", className: "text-muted", title: "Pending" },
  APPROVED: { name: "tick-circle", className: "text-success", title: "Approved" },
  REQUESTED_FOR_CHANGES: { name: "diff", className: "text-warning", title: "Requested for changes" },
};

type ReviewListPanelProps = {
  reviews: PullRequestReview[];
  editable?: boolean;
  onRemove?: (userId: number) => void;
  onRequestAgain?: (userId: number) => void;
  addReviewerSlot?: React.ReactNode;
};

export function ReviewListPanel({
  reviews,
  editable,
  onRemove,
  onRequestAgain,
  addReviewerSlot,
}: ReviewListPanelProps) {
  return (
    <ul className="reviews list-unstyled mb-0">
      {reviews.map((review) => {
        const status = REVIEW_STATUS_ICON[review.status] ?? REVIEW_STATUS_ICON.PENDING;
        return (
          <li key={review.id} className="d-flex flex-nowrap align-items-center mb-2">
            <span className="reviewer left mr-2 flex-shrink-0 font-weight-bold">
              {review.user?.name ?? "Unknown"}
            </span>
            <span className="flex-shrink-0 right d-flex align-items-center ml-auto">
              {editable && review.status === "REQUESTED_FOR_CHANGES" && onRequestAgain && review.user && (
                <button
                  type="button"
                  className="refresh btn btn-xs btn-icon btn-light btn-hover-primary flex-shrink-0 mr-2"
                  title="Request review again"
                  onClick={() => onRequestAgain(review.user!.id)}
                >
                  <Icon name="refresh" />
                </button>
              )}
              {editable && onRemove && review.user && (
                <button
                  type="button"
                  className="delete btn btn-xs btn-icon btn-light btn-hover-danger flex-shrink-0 mr-2"
                  title="Remove this reviewer"
                  onClick={() => onRemove(review.user!.id)}
                >
                  <Icon name="trash" />
                </button>
              )}
              <span className={`status flex-shrink-0 ${status.className}`} title={status.title}>
                <Icon name={status.name} />
              </span>
            </span>
          </li>
        );
      })}
      {editable && addReviewerSlot && <li className="add-reviewer mt-2">{addReviewerSlot}</li>}
      {!reviews.length && <li className="text-muted font-size-sm">No reviewers</li>}
    </ul>
  );
}
