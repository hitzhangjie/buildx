import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import {
  createIssueComment,
  fetchIssueByNumber,
  fetchIssueComments,
  fetchIssueIterations,
  formatIssueDate,
  setIssueIterations,
  stateBadgeColor,
  transitionIssueState,
  type Issue,
  type IssueComment,
} from "../../../api/issues";
import { fetchIssueSetting } from "../../../api/issueSettings";
import {
  fetchProjectIterations,
} from "../../../api/iterations";
import { useProject } from "../../../context/ProjectContext";
import { useAsyncResource } from "../../../hooks/useAsyncResource";
import { ProjectLayout } from "../../../layout/ProjectLayout";

type TabId = "activities" | "commits" | "pulls" | "builds";

const TABS: { id: TabId; label: string; href: string }[] = [
  { id: "activities", label: "Activities", href: "" },
  { id: "commits", label: "Commits", href: "/commits" },
  { id: "pulls", label: "Pull Requests", href: "/pulls" },
  { id: "builds", label: "Builds", href: "/builds" },
];

function TabNav({
  activeTab,
  projectPath,
  issueNumber,
}: {
  activeTab: TabId;
  projectPath: string;
  issueNumber: number;
}) {
  const base = `/${projectPath}/~issues/${issueNumber}`;

  return (
    <ul className="nav nav-tabs mb-4">
      {TABS.map((tab) => (
        <li key={tab.id} className="nav-item">
          <Link
            to={base + tab.href}
            className={`nav-link${activeTab === tab.id ? " active" : ""}`}
          >
            {tab.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Mirrors OneDev IssueDetailPage (activities tab).
 * Reference: references/onedev/.../web/page/project/issues/detail/IssueDetailPage.html
 */
export function IssueDetailPage() {
  const { projectPath } = useProject();
  const { issue: issueParam } = useParams<{ issue: string }>();
  const issueNumber = parseInt(issueParam ?? "0", 10);

  const [activeTab] = useState<TabId>("activities");
  const [newComment, setNewComment] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [commentRefresh, setCommentRefresh] = useState(0);
  const [scheduleRefresh, setScheduleRefresh] = useState(0);
  const [selectedIterationIds, setSelectedIterationIds] = useState<number[]>([]);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [stateError, setStateError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [issueRefresh, setIssueRefresh] = useState(0);

  const {
    data: issue,
    loading: issueLoading,
    error: issueError,
  } = useAsyncResource<Issue | null>(
    () => fetchIssueByNumber(projectPath, issueNumber),
    [projectPath, issueNumber, issueRefresh],
  );

  const { data: issueSetting } = useAsyncResource(() => fetchIssueSetting(), []);

  const {
    data: comments,
    loading: commentsLoading,
    error: commentsError,
  } = useAsyncResource<IssueComment[]>(
    async () => {
      if (!issue) {
        return [];
      }
      return fetchIssueComments(issue.id);
    },
    [issue?.id, commentRefresh],
  );

  const { data: scheduledIterations } = useAsyncResource(
    async () => {
      if (!issue) {
        return [];
      }
      return fetchIssueIterations(issue.id);
    },
    [issue?.id, scheduleRefresh],
  );

  const { data: projectIterations } = useAsyncResource(
    () => fetchProjectIterations(projectPath),
    [projectPath],
  );

  useEffect(() => {
    if (scheduledIterations) {
      setSelectedIterationIds(scheduledIterations.map((i) => i.id));
    }
  }, [scheduledIterations]);

  async function handleStateChange(newState: string) {
    if (!issue || issue.state === newState) {
      return;
    }
    setTransitioning(true);
    setStateError(null);
    try {
      await transitionIssueState(issue.id, newState);
      setIssueRefresh((n) => n + 1);
    } catch (err) {
      setStateError((err as { message?: string }).message ?? "Failed to change state");
    } finally {
      setTransitioning(false);
    }
  }

  async function handleSaveSchedule() {
    if (!issue) {
      return;
    }
    setSavingSchedule(true);
    setScheduleError(null);
    try {
      await setIssueIterations(issue.id, selectedIterationIds);
      setScheduleRefresh((n) => n + 1);
    } catch (err) {
      setScheduleError((err as { message?: string }).message ?? "Failed to update schedule");
    } finally {
      setSavingSchedule(false);
    }
  }

  function toggleIteration(id: number) {
    setSelectedIterationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleCommentSubmit() {
    if (!issue || !newComment.trim()) {
      return;
    }
    setSubmitting(true);
    setCommentError(null);
    try {
      await createIssueComment(issue.id, newComment.trim());
      setNewComment("");
      setCommentRefresh((n) => n + 1);
    } catch (err) {
      setCommentError((err as { message?: string }).message ?? "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }

  const pageTitle = issue
    ? `#${issueNumber} ${issue.title}`
    : `Issue #${issueNumber}`;

  return (
    <ProjectLayout projectPath={projectPath} pageTitle={pageTitle}>
      <div className="card m-3">
        <div className="card-body">
          {issueLoading && (
            <div className="text-muted mb-3">Loading issue...</div>
          )}
          {issueError && (
            <div className="alert alert-danger" role="alert">
              {issueError}
            </div>
          )}
          {issue && (
            <>
              <div className="d-flex align-items-center flex-wrap mb-3" style={{ gap: "0.5rem" }}>
                <h4 className="mb-0 mr-3">
                  #{issueNumber} {issue.title}
                </h4>
                <span
                  className={`badge badge-${stateBadgeColor(issue.state)} font-size-sm`}
                >
                  {issue.state}
                </span>
                {(issueSetting?.stateSpecs.length ?? 0) > 0 && (
                  <div className="d-flex align-items-center ml-2">
                    <label className="text-muted font-size-sm mb-0 mr-2" htmlFor="issue-state-select">
                      Transition to
                    </label>
                    <select
                      id="issue-state-select"
                      className="form-control form-control-sm"
                      style={{ width: "160px" }}
                      value=""
                      disabled={transitioning}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v) {
                          void handleStateChange(v);
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="">Select state...</option>
                      {issueSetting!.stateSpecs
                        .filter((s) => s.name !== issue.state)
                        .map((s) => (
                          <option key={s.name} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
              {stateError && (
                <div className="alert alert-danger py-2" role="alert">
                  {stateError}
                </div>
              )}
              <div className="text-muted font-size-sm mb-4">
                <span className="mr-3">
                  <Icon name="user" /> {issue.submitter?.name ?? "unknown"}
                </span>
                <span>{formatIssueDate(issue.submitDate)}</span>
              </div>
              {issue.description && (
                <div className="mb-4 p-3 bg-light rounded white-space-pre-wrap">
                  {issue.description}
                </div>
              )}
              {issue && (projectIterations?.length ?? 0) > 0 && (
                <div className="mb-4">
                  <h6 className="font-weight-bold">Iterations</h6>
                  {scheduleError && (
                    <div className="alert alert-danger py-2" role="alert">
                      {scheduleError}
                    </div>
                  )}
                  <div className="d-flex flex-wrap mb-2">
                    {projectIterations!.map((iter) => (
                      <label
                        key={iter.id}
                        className="btn btn-sm btn-outline-secondary mr-2 mb-2"
                      >
                        <input
                          type="checkbox"
                          className="mr-1"
                          checked={selectedIterationIds.includes(iter.id)}
                          onChange={() => toggleIteration(iter.id)}
                        />
                        <Link
                          to={`/${projectPath}/~iterations/${iter.id}`}
                          className="text-body"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {iter.name}
                        </Link>
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary font-weight-bold"
                    disabled={savingSchedule}
                    onClick={() => void handleSaveSchedule()}
                  >
                    {savingSchedule ? "Saving..." : "Update schedule"}
                  </button>
                </div>
              )}
            </>
          )}

          <TabNav
            activeTab={activeTab}
            projectPath={projectPath}
            issueNumber={issueNumber}
          />

          {activeTab === "activities" && (
            <div>
              <h5 className="mb-3">Comments</h5>
              {commentsLoading && (
                <div className="text-muted mb-3">Loading comments...</div>
              )}
              {commentsError && (
                <div className="alert alert-danger" role="alert">
                  {commentsError}
                </div>
              )}
              {(comments ?? []).map((comment) => (
                <div key={comment.id} className="card mb-3">
                  <div className="card-body">
                    <div className="d-flex justify-content-between text-muted font-size-sm mb-2">
                      <span className="font-weight-bold">
                        {comment.user?.name ?? "unknown"}
                      </span>
                      <span>{formatIssueDate(comment.createDate)}</span>
                    </div>
                    <div className="white-space-pre-wrap">{comment.content}</div>
                  </div>
                </div>
              ))}
              {issue && (
                <div className="mt-4">
                  <h6 className="mb-2">Add a comment</h6>
                  {commentError && (
                    <div className="alert alert-danger py-2" role="alert">
                      {commentError}
                    </div>
                  )}
                  <textarea
                    className="form-control mb-2"
                    rows={4}
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-primary font-weight-bold"
                    disabled={!newComment.trim() || submitting}
                    onClick={() => void handleCommentSubmit()}
                  >
                    {submitting ? "Posting..." : "Comment"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProjectLayout>
  );
}
