import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import {
  deleteIssue,
  setIssueIterations,
  type Issue,
} from "../../../api/issues";
import { fetchProjectIterations, type Iteration } from "../../../api/iterations";

export interface IssueSidebarProps {
  issue: Issue;
  projectPath: string;
  iterations: Iteration[];
  onIssueUpdate: () => void;
}

/**
 * Right sidebar panel for issue detail page.
 * Sections: fields, confidential, iterations, branch, votes, watches, reference, delete.
 * Mirrors OneDev IssueSidePanel.
 * Reference: references/onedev/.../web/component/issue/side/IssueSidePanel.html
 */
export function IssueSidebar({
  issue,
  projectPath,
  iterations,
  onIssueUpdate,
}: IssueSidebarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Iterations management
  const [savingIterations, setSavingIterations] = useState(false);
  const [allIterations, setAllIterations] = useState<Iteration[]>([]);
  const [loadedAllIterations, setLoadedAllIterations] = useState(false);

  const currentIterationIds = new Set(iterations.map((i) => i.id));

  const loadAllIterations = async () => {
    if (loadedAllIterations) return;
    try {
      const all = await fetchProjectIterations(projectPath);
      setAllIterations(all);
      setLoadedAllIterations(true);
    } catch {
      // ignore
    }
  };

  const handleRemoveIteration = async (iterationId: number) => {
    setSavingIterations(true);
    try {
      const newIds = iterations.filter((i) => i.id !== iterationId).map((i) => i.id);
      await setIssueIterations(issue.id, newIds);
      onIssueUpdate();
    } catch {
      // ignore
    } finally {
      setSavingIterations(false);
    }
  };

  const handleAddIteration = async (iterationId: number) => {
    setSavingIterations(true);
    try {
      const newIds = [...iterations.map((i) => i.id), iterationId];
      await setIssueIterations(issue.id, newIds);
      onIssueUpdate();
    } catch {
      // ignore
    } finally {
      setSavingIterations(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteIssue(issue.id);
      // Navigate back to issue list
      window.location.href = `/${projectPath}/~issues`;
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const statusLabel = (iter: Iteration): string => {
    if (iter.closed) return "Closed";
    const today = Math.floor(Date.now() / 86400000);
    if (iter.startDay != null && iter.startDay > today) return "Upcoming";
    return "Active";
  };

  return (
    <div className="issue-side pl-4 ml-3" style={{ width: 320, maxWidth: 320, flexShrink: 0 }}>
      {/* Fields section — stub (backend not implemented) */}
      <div className="fields">
        <div className="head">Fields</div>
        <div className="body">
          <div className="text-muted font-size-sm">
            No custom fields configured.
          </div>
        </div>
      </div>

      {/* Confidential toggle — stub */}
      <div className="confidential d-flex align-items-center justify-content-between">
        <div className="font-weight-bolder mr-3">Confidential</div>
        <div className="switch switch-sm switch-primary">
          <label>
            <input
              type="checkbox"
              checked={issue.confidential}
              disabled
              readOnly
            />
          </label>
        </div>
      </div>

      {/* Iterations */}
      <div className="iterations">
        <div className="head">Iterations</div>
        <ul className="body list-unstyled mb-0">
          {iterations.map((iter) => (
            <li key={iter.id} className="bg-light rounded p-3" style={{ marginBottom: "0.75rem" }}>
              <div className="d-flex">
                <Link
                  to={`/${projectPath}/~iterations/${iter.id}`}
                  className="mr-2"
                >
                  <span>{iter.name}</span>
                </Link>
                <a
                  className="mr-2 flex-shrink-0"
                  title="Remove issue from this iteration"
                  role="button"
                  tabIndex={0}
                  onClick={() => void handleRemoveIteration(iter.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleRemoveIteration(iter.id);
                    }
                  }}
                >
                  <Icon name="trash" className="icon icon-sm" />
                </a>
                <span className="status ml-auto badge badge-light-secondary font-size-xs">
                  {statusLabel(iter)}
                </span>
              </div>
              {iter.scheduleCount != null && iter.scheduleCount > 0 && (
                <div className="mt-2">
                  <div className="d-flex justify-content-between font-size-xs text-muted">
                    <span>{iter.scheduleCount} scheduled issue{iter.scheduleCount !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              )}
            </li>
          ))}
          {iterations.length === 0 && (
            <li className="text-muted font-size-sm">Not scheduled in any iteration.</li>
          )}
          {/* Add iteration dropdown */}
          <li className="add mt-2">
            <details
              className="dropdown"
              onToggle={() => {
                void loadAllIterations();
              }}
            >
              <summary className="btn btn-sm btn-outline-secondary">
                <Icon name="plus" className="icon mr-1" /> Add iteration
              </summary>
              <div className="dropdown-menu p-2" style={{ minWidth: 200 }}>
                {allIterations
                  .filter((ai) => !currentIterationIds.has(ai.id))
                  .map((ai) => (
                    <button
                      key={ai.id}
                      type="button"
                      className="dropdown-item"
                      disabled={savingIterations}
                      onClick={() => void handleAddIteration(ai.id)}
                    >
                      {ai.name}
                    </button>
                  ))}
                {allIterations.filter((ai) => !currentIterationIds.has(ai.id)).length === 0 && (
                  <span className="dropdown-item text-muted">No more iterations</span>
                )}
              </div>
            </details>
          </li>
        </ul>
      </div>

      {/* Associated Branch — stub */}
      <div className="branch">
        <div className="head">Associated Branch</div>
        <div className="body d-flex align-items-center">
          <button type="button" className="btn btn-outline-secondary btn-sm flex-shrink-0">
            <Icon name="plus" className="icon mr-2" />
            Create
          </button>
        </div>
      </div>

      {/* Votes */}
      <div className="votes">
        <div className="head">
          Issue Votes ({issue.voteCount ?? 0})
        </div>
        <div className="body">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm vote"
            disabled
            title="Vote API not yet implemented"
          >
            <Icon name="thumb-up" className="icon mr-2" />
            Vote
          </button>
        </div>
      </div>

      {/* Watches — stub */}
      <div className="watches">
        <div className="head">Watches</div>
        <div className="body text-muted font-size-sm">
          Watch functionality not yet available.
        </div>
      </div>

      {/* Reference */}
      <div className="reference">
        <div className="head">Reference</div>
        <div className="body">
          <code>{projectPath}#{issue.number}</code>
        </div>
      </div>

      {/* Delete */}
      <div>
        {!showDeleteConfirm ? (
          <button
            type="button"
            className="delete btn btn-light-danger"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete
          </button>
        ) : (
          <div className="d-flex align-items-center">
            <span className="text-danger mr-3 font-size-sm">Are you sure?</span>
            <button
              type="button"
              className="btn btn-danger btn-sm mr-2"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? "Deleting..." : "Yes"}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={deleting}
              onClick={() => setShowDeleteConfirm(false)}
            >
              No
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
