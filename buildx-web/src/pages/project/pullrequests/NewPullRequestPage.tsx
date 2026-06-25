import { useEffect, useState, useCallback, useRef, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { Select2MultiChoice } from "../../../components/onedev/Select2MultiChoice";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { useProject } from "../../../context/ProjectContext";
import {
  createPullRequest,
  fetchPullRequest,
  mergeStrategyLabel,
  type CreatePullRequestRequest,
} from "../../../api/pullRequests";
import { fetchBranches, fetchDefaultBranch, type RepositoryCommit } from "../../../api/repositories";
import { fetchProjects } from "../../../api/projects";
import { fetchUsers, fetchCurrentUser, type User } from "../../../api/users";
import { fetchCompare, type CompareResult } from "../../../api/compare";
import { BranchSelector, type BranchSelection } from "../../../components/onedev/panels/BranchSelector";
import { fetchLabelSpecs } from "../../../api/labels";
import "./new-pull-request-page.css";

type StatusFragment =
  | "branchNotSpecified"
  | "sameBranch"
  | "unrelatedHistory"
  | "effective"
  | "merged"
  | "canSend";

const MERGE_STRATEGIES = [
  "CREATE_MERGE_COMMIT",
  "CREATE_MERGE_COMMIT_IF_NECESSARY",
  "SQUASH_SOURCE_BRANCH_COMMITS",
  "REBASE_SOURCE_BRANCH_COMMITS",
] as const;

function formatTime(when: number): string {
  const d = new Date(when);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined });
}

/** Inline user search for adding reviewers / assignees. */
function UserSearchInput({
  onSelect,
  placeholder,
  excludeIds,
}: {
  onSelect: (u: User) => void;
  placeholder: string;
  excludeIds: number[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!open) return;
    function click(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, [open]);

  const doSearch = useCallback(
    (q: string) => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setSearching(true);
      fetchUsers(q)
        .then((list) => setResults(list.filter((u) => !excludeIds.includes(u.id))))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    },
    [excludeIds],
  );

  const handleInput = (val: string) => {
    setQuery(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(val), 300);
  };

  return (
    <div ref={rootRef} className="search-input position-relative">
      <input
        type="text"
        className="form-control form-control-sm"
        placeholder={placeholder}
        value={query}
        onFocus={() => {
          setOpen(true);
          if (query.trim()) doSearch(query);
        }}
        onChange={(e) => handleInput(e.target.value)}
      />
      {open && (
        <div
          className="floating dropdown-menu show position-absolute w-100"
          style={{ zIndex: 1060, maxHeight: 200, overflowY: "auto" }}
        >
          {searching && <div className="text-muted p-2">Searching…</div>}
          {!searching && results.length === 0 && query.trim() && (
            <div className="text-muted p-2">No users found</div>
          )}
          {results.map((u) => (
            <a
              key={u.id}
              href="#"
              className="dropdown-item d-flex align-items-center"
              onClick={(e) => {
                e.preventDefault();
                onSelect(u);
                setQuery("");
                setOpen(false);
              }}
            >
              <span
                className="avatar avatar-sm mr-2"
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "var(--primary)",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {(u.fullName || u.name).charAt(0).toUpperCase()}
              </span>
              {u.fullName || u.name}
              {u.name !== (u.fullName || u.name) && (
                <span className="text-muted ml-1">@{u.name}</span>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function NewPullRequestPage() {
  const { projectPath } = useProject();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [projectId, setProjectId] = useState<number | null>(null);

  // Form state.
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mergeStrategy, setMergeStrategy] = useState<string>("CREATE_MERGE_COMMIT_IF_NECESSARY");

  // Branch selection state.
  const [targetProjectId, setTargetProjectId] = useState<number | null>(null);
  const [sourceProjectId, setSourceProjectId] = useState<number | null>(null);
  const [targetBranch, setTargetBranch] = useState(searchParams.get("target") ?? "");
  const [sourceBranch, setSourceBranch] = useState(searchParams.get("source") ?? "");

  const [statusFragment, setStatusFragment] = useState<StatusFragment>("branchNotSpecified");
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Preview tab.
  const [activeTab, setActiveTab] = useState<"commits" | "changes">("commits");

  // Compare API result.
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  // Reviewers / assignees / labels.
  const [reviewers, setReviewers] = useState<User[]>([]);
  const [assignees, setAssignees] = useState<User[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [labelChoices, setLabelChoices] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Resolve project ID.
  useEffect(() => {
    let cancelled = false;
    fetchProjects()
      .then((projects) => {
        if (!cancelled) {
          const p = projects.find((proj) => proj.path === projectPath);
          setProjectId(p?.id ?? null);
          if (p) {
            setTargetProjectId(p.id);
            setSourceProjectId(p.id);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setProjectId(null);
      });
    return () => { cancelled = true; };
  }, [projectPath]);

  // Load current user for "assign to me".
  useEffect(() => {
    fetchCurrentUser().then((u) => setCurrentUser(u)).catch(() => {});
  }, []);

  // Fetch label specs for the labels multi-choice.
  useEffect(() => {
    fetchLabelSpecs()
      .then((specs) => setLabelChoices(specs.map((s) => s.name)))
      .catch(() => {});
  }, []);

  // Set default branches from URL params.
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    Promise.all([fetchBranches(projectId), fetchDefaultBranch(projectId)])
      .then(([branchList, defaultBranch]) => {
        if (cancelled) return;
        const urlTarget = searchParams.get("target");
        const urlSource = searchParams.get("source");
        if (!urlTarget && defaultBranch) {
          setTargetBranch(defaultBranch);
        }
        if (!urlSource && branchList.length > 1) {
          const nonDefault = branchList.find((b) => b !== defaultBranch);
          if (nonDefault) setSourceBranch(nonDefault);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [projectId, searchParams]);

  // Fetch compare data when both branches are selected.
  useEffect(() => {
    if (!targetProjectId || !targetBranch.trim() || !sourceBranch.trim()) return;

    // Quick local checks first.
    if (targetBranch === sourceBranch && targetProjectId === sourceProjectId) {
      setStatusFragment("sameBranch");
      return;
    }

    setCompareLoading(true);
    fetchCompare(targetProjectId, {
      left: targetBranch.trim(),
      right: sourceBranch.trim(),
      includeCommits: true,
      includeDiffs: true,
      includeEffectivePullRequest: true,
      includeMergePreview: true,
      count: 100,
    })
      .then((result) => {
        setCompareResult(result);

        // Compute status fragment from compare result.
        if (!result.mergeBase) {
          setStatusFragment("unrelatedHistory");
        } else if (result.effectivePullRequest) {
          setStatusFragment("effective");
        } else if (result.left.commitHash === result.right.commitHash) {
          setStatusFragment("merged");
        } else {
          setStatusFragment("canSend");
          // Auto-generate title from first commit if empty.
          if (!title && result.commits?.length) {
            const firstCommit = result.commits[0];
            if (firstCommit.subject) {
              setTitle(firstCommit.subject);
            }
          }
        }
      })
      .catch(() => {
        // On error, fall back to simple check.
        setStatusFragment("canSend");
      })
      .finally(() => setCompareLoading(false));
  }, [targetProjectId, targetBranch, sourceProjectId, sourceBranch]);

  // Update status when branches change without waiting for compare.
  useEffect(() => {
    if (!targetBranch.trim() || !sourceBranch.trim()) {
      setStatusFragment("branchNotSpecified");
      return;
    }
    if (targetBranch === sourceBranch && targetProjectId === sourceProjectId) {
      setStatusFragment("sameBranch");
      return;
    }
  }, [targetBranch, sourceBranch, targetProjectId, sourceProjectId]);

  // Handlers.
  const handleTargetSelect = useCallback((sel: BranchSelection) => {
    setTargetProjectId(sel.projectId);
    setTargetBranch(sel.branch);
  }, []);

  const handleSourceSelect = useCallback((sel: BranchSelection) => {
    setSourceProjectId(sel.projectId);
    setSourceBranch(sel.branch);
  }, []);

  function handleSwap() {
    const tmpBranch = targetBranch;
    const tmpProject = targetProjectId;
    setTargetBranch(sourceBranch);
    setTargetProjectId(sourceProjectId);
    setSourceBranch(tmpBranch);
    setSourceProjectId(tmpProject);
  }

  const addReviewer = useCallback((u: User) => {
    setReviewers((prev) => (prev.some((r) => r.id === u.id) ? prev : [...prev, u]));
  }, []);

  const removeReviewer = useCallback((u: User) => {
    setReviewers((prev) => prev.filter((r) => r.id !== u.id));
  }, []);

  const addAssignee = useCallback((u: User) => {
    setAssignees((prev) => (prev.some((a) => a.id === u.id) ? prev : [...prev, u]));
  }, []);

  const removeAssignee = useCallback((u: User) => {
    setAssignees((prev) => prev.filter((a) => a.id !== u.id));
  }, []);

  function assignToMe() {
    if (currentUser) addAssignee(currentUser);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormErrors([]);

    const errors: string[] = [];
    if (!title.trim()) errors.push("Title is required");
    if (!sourceBranch.trim()) errors.push("Source branch is required");
    if (!targetBranch.trim()) errors.push("Target branch is required");
    if (sourceBranch === targetBranch && sourceProjectId === targetProjectId) {
      errors.push("Source and target branches must be different");
    }
    if (!targetProjectId || !sourceProjectId) {
      errors.push("Both target and source projects must be selected");
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const req: CreatePullRequestRequest = {
        targetProjectId: targetProjectId!,
        sourceProjectId: sourceProjectId!,
        targetBranch: targetBranch.trim(),
        sourceBranch: sourceBranch.trim(),
        title: title.trim(),
        description,
        mergeStrategy,
        reviewerIds: reviewers.length > 0 ? reviewers.map((r) => r.id) : undefined,
        assigneeIds: assignees.length > 0 ? assignees.map((a) => a.id) : undefined,
        labelIds: labels.length > 0 ? labels : undefined,
      };
      const id = await createPullRequest(req);
      const pr = await fetchPullRequest(id);
      navigate(`/${projectPath}/~pulls/${pr.number}`);
    } catch (err) {
      setFormErrors([(err as { message?: string }).message ?? "Failed to create pull request"]);
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    navigate(`/${projectPath}/~pulls`);
  }

  const canSubmit = statusFragment === "canSend";
  const targetCommitSubject = compareResult?.left?.subject ?? "";
  const sourceCommitSubject = compareResult?.right?.subject ?? "";
  const commits = compareResult?.commits ?? [];
  const diffs = compareResult?.diffs ?? [];
  const effectivePR = compareResult?.effectivePullRequest;
  const mergePreview = compareResult?.mergePreview;

  // Reviewer IDs for exclusion in search.
  const reviewerIds = reviewers.map((r) => r.id);
  const assigneeIds = assignees.map((a) => a.id);

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="New Pull Request">
      <div className="p-5 new-pull-request">
        {/* ---- Revision Compare ---- */}
        <div className="revision-compare mb-5">
          <div className="base revision card">
            <div className="card-body">
              <div className="title">Target</div>
              <div className="selector">
                <BranchSelector
                  defaultProjectPath={projectPath}
                  revision={targetBranch}
                  onSelect={handleTargetSelect}
                  label="Target Branch"
                />
              </div>
              {targetBranch ? (
                <a
                  className="message"
                  href={`/${projectPath}/~commits/${targetBranch}`}
                >
                  {targetCommitSubject || targetBranch}
                </a>
              ) : (
                <span className="message">Select target branch</span>
              )}
            </div>
          </div>

          <div className="swap">
            <button
              type="button"
              className="btn btn-primary btn-icon"
              onClick={handleSwap}
              title="Swap source and target"
              data-tippy-content="Swap"
            >
              <Icon name="swap" />
            </button>
          </div>

          <div className="compare revision card">
            <div className="card-body">
              <div className="title">Source</div>
              <div className="selector">
                <BranchSelector
                  defaultProjectPath={projectPath}
                  revision={sourceBranch}
                  onSelect={handleSourceSelect}
                  label="Source Branch"
                />
              </div>
              {sourceBranch ? (
                <a
                  className="message"
                  href={`/${projectPath}/~commits/${sourceBranch}`}
                >
                  {sourceCommitSubject || sourceBranch}
                </a>
              ) : (
                <span className="message">Select source branch</span>
              )}
            </div>
          </div>
        </div>

        {/* ---- Loading State ---- */}
        {compareLoading && (
          <div className="text-center text-muted py-4 mb-5">
            <Icon name="loading" className="spin mr-2" />
            Comparing revisions…
          </div>
        )}

        {/* ---- Status Fragment ---- */}
        <div className="status">
          {statusFragment === "branchNotSpecified" && (
            <div className="alert alert-notice alert-light-warning shadow mb-5">
              <div className="summary">
                <span>Please select branches to create pull request</span>
              </div>
            </div>
          )}
          {statusFragment === "sameBranch" && (
            <div className="alert alert-notice alert-light-warning shadow mb-5">
              <div className="summary">
                <span>Please select different branches</span>
              </div>
            </div>
          )}
          {statusFragment === "unrelatedHistory" && (
            <div className="alert alert-notice alert-light-warning shadow mb-5">
              <div className="summary">
                <span>History of target branch and source branch is unrelated</span>
              </div>
            </div>
          )}
          {statusFragment === "merged" && (
            <div className="alert alert-notice alert-light-success shadow mb-5">
              <div className="summary">
                <span>
                  Branch <strong>{targetBranch}</strong> is up to date with all commits from{" "}
                  <strong>{sourceBranch}</strong>. Try{" "}
                  <a href="#" onClick={(e) => { e.preventDefault(); handleSwap(); }}>
                    swapping source and target
                  </a>{" "}
                  for the comparison.
                </span>
              </div>
            </div>
          )}
          {statusFragment === "effective" && effectivePR && (
            <div className="alert alert-notice alert-light-success shadow mb-5">
              <span>
                {effectivePR.status === "OPEN"
                  ? "This change is already opened for merge by "
                  : "This change is squashed/rebased onto base branch via "}
              </span>
              <a href={`/${effectivePR.targetProject?.path ?? projectPath}/~pulls/${effectivePR.number}`}>
                pull request {effectivePR.number}
              </a>
            </div>
          )}
          {statusFragment === "effective" && !effectivePR && (
            <div className="alert alert-notice alert-light-success shadow mb-5">
              <span>This change is already opened for merge.</span>{" "}
              <a href={`/${projectPath}/~pulls`}>View pull requests</a>
            </div>
          )}
        </div>

        {/* ---- canSend Form ---- */}
        {canSubmit && (
          <div className="card can-send mb-5">
            <div className="card-body">
              <form className="leave-confirm" method="post" onSubmit={handleSubmit}>
                <FormFeedbackPanel messages={formErrors} />

                {/* Title */}
                <div className="form-group pull-request-title">
                  <label>
                    Title <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Input title here"
                    required
                  />
                  <div className="text-muted form-text">
                    Prefix the title with <code>WIP</code> or <code>[WIP]</code> to mark the pull
                    request as work in progress
                  </div>
                </div>

                {/* Description */}
                <div className="form-group pull-request-description">
                  <label>Description</label>
                  <textarea
                    className="form-control"
                    rows={8}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the changes in this pull request"
                  />
                </div>

                {/* Merge Strategy */}
                <div className="form-group merge-strategy">
                  <label>
                    Merge Strategy <span className="text-danger">*</span>
                  </label>
                  <div className="merge-strategy">
                    <select
                      className="form-control custom-select"
                      value={mergeStrategy}
                      onChange={(e) => setMergeStrategy(e.target.value)}
                    >
                      {MERGE_STRATEGIES.map((s) => (
                        <option key={s} value={s}>
                          {mergeStrategyLabel(s)}
                        </option>
                      ))}
                    </select>
                    <div className="form-text text-muted mt-2">
                      {mergeStrategy === "CREATE_MERGE_COMMIT" &&
                        "Always create a merge commit, even when fast-forward is possible."}
                      {mergeStrategy === "CREATE_MERGE_COMMIT_IF_NECESSARY" &&
                        "Only create a merge commit when necessary. Fast forward if possible."}
                      {mergeStrategy === "SQUASH_SOURCE_BRANCH_COMMITS" &&
                        "Squash all source branch commits into a single commit."}
                      {mergeStrategy === "REBASE_SOURCE_BRANCH_COMMITS" &&
                        "Rebase source branch commits onto the target branch."}
                    </div>
                    <div className="status mt-2">
                      {compareLoading && (
                        <span className="calculating">
                          <Icon name="loading" className="spin mr-1" />
                          Calculating merge preview…
                        </span>
                      )}
                      {!compareLoading && mergePreview && !mergePreview.conflicted && (
                        <span className="no-conflict">
                          <svg className="icon mt-n1 mr-1" width="18" height="18" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                            <path d="M8 12l3 3 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
                          </svg>
                          Able to merge without conflicts
                        </span>
                      )}
                      {!compareLoading && mergePreview && mergePreview.conflicted && (
                        <span className="conflict">
                          <svg className="icon mt-n1 mr-1" width="18" height="18" viewBox="0 0 24 24">
                            <path d="M12 2L2 22h20L12 2z" fill="none" stroke="currentColor" strokeWidth="2" />
                            <line x1="12" y1="10" x2="12" y2="16" stroke="currentColor" strokeWidth="2" />
                            <circle cx="12" cy="19" r="1" fill="currentColor" />
                          </svg>
                          There are merge conflicts. You can still create the pull request though
                        </span>
                      )}
                      {!compareLoading && !mergePreview && (
                        <span className="text-muted">
                          Merge preview will be calculated upon creation
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reviewers */}
                <div className="form-group">
                  <label>Reviewers</label>
                  <ul className="reviews list-unstyled mb-0">
                    {reviewers.map((user) => (
                      <li key={user.id} className="d-flex flex-nowrap align-items-center">
                        <span className="reviewer left mr-2 flex-shrink-0 font-weight-bold">
                          {user.fullName || user.name}
                        </span>
                        <span className="flex-shrink-0 right d-flex align-items-center ml-auto">
                          <button
                            type="button"
                            className="delete btn btn-xs btn-icon btn-light btn-hover-danger flex-shrink-0 mr-2"
                            title="Remove this reviewer"
                            onClick={() => removeReviewer(user)}
                          >
                            <Icon name="trash" />
                          </button>
                        </span>
                      </li>
                    ))}
                    <li className="add-reviewer mt-2">
                      <UserSearchInput
                        onSelect={addReviewer}
                        placeholder="Add reviewer…"
                        excludeIds={reviewerIds}
                      />
                    </li>
                  </ul>
                  <div className="text-muted form-text mt-2">
                    Pull request can only be merged after getting approvals from all reviewers
                  </div>
                </div>

                {/* Assignees */}
                <div className="form-group">
                  <label>
                    Assignees
                    {currentUser && !assignees.some((a) => a.id === currentUser.id) && (
                      <a
                        href="#"
                        className="ml-2 font-weight-normal font-size-sm assign-to-me"
                        onClick={(e) => {
                          e.preventDefault();
                          assignToMe();
                        }}
                      >
                        assign to me
                      </a>
                    )}
                  </label>
                  <ul className="assignments list-unstyled mb-0">
                    {assignees.map((user) => (
                      <li key={user.id} className="d-flex align-items-center flex-nowrap">
                        <span className="mr-2 left flex-shrink-0 font-weight-bold">
                          {user.fullName || user.name}
                        </span>
                        <button
                          type="button"
                          className="right delete btn btn-icon btn-xs btn-light btn-hover-danger flex-shrink-0 ml-auto"
                          title="Remove this assignee"
                          onClick={() => removeAssignee(user)}
                        >
                          <Icon name="trash" />
                        </button>
                      </li>
                    ))}
                    <li className="add-assignee mt-2">
                      <UserSearchInput
                        onSelect={addAssignee}
                        placeholder="Add assignee…"
                        excludeIds={assigneeIds}
                      />
                    </li>
                  </ul>
                  <div className="text-muted form-text mt-2">
                    Assignees have code write permission and will be responsible for merging the
                    pull request
                  </div>
                </div>

                {/* Labels */}
                <div className="form-group">
                  <label>Labels</label>
                  <Select2MultiChoice
                    values={labels}
                    onChange={setLabels}
                    choices={labelChoices}
                    placeholder="Choose labels…"
                    creatable
                  />
                </div>

                {/* Submit */}
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Creating…" : "Send Pull Request"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary ml-3"
                  onClick={handleCancel}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ---- Preview Tabs (Commits / File Changes) ---- */}
        {(statusFragment === "canSend" || statusFragment === "effective") && targetBranch && sourceBranch && (
          <div className="card">
            <div className="card-body">
              <ul className="nav nav-tabs nav-tabs-line nav-bolder mb-5">
                <li className="nav-item">
                  <a
                    className={`nav-link${activeTab === "commits" ? " active" : ""}`}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab("commits");
                    }}
                  >
                    Commits
                    {commits.length > 0 && (
                      <span className="badge badge-light-primary ml-2">{commits.length}</span>
                    )}
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className={`nav-link${activeTab === "changes" ? " active" : ""}`}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab("changes");
                    }}
                  >
                    File Changes
                    {diffs.length > 0 && (
                      <span className="badge badge-light-primary ml-2">{diffs.length}</span>
                    )}
                  </a>
                </li>
              </ul>
              <div className="tab-panel">
                {activeTab === "commits" && (
                  <>
                    {compareLoading && (
                      <div className="text-muted text-center py-4">
                        <Icon name="loading" className="spin mr-2" />
                        Loading commits…
                      </div>
                    )}
                    {!compareLoading && commits.length === 0 && (
                      <div className="text-muted text-center py-4">
                        <Icon name="commit" className="mr-2" />
                        No commits between {targetBranch} and {sourceBranch}
                      </div>
                    )}
                    {!compareLoading && commits.length > 0 && (
                      <div className="commit-list">
                        {commits.map((c: RepositoryCommit) => (
                          <div key={c.hash} className="commit-item d-flex align-items-start py-2 border-bottom">
                            <Icon name="commit" className="icon text-muted mr-2 mt-1 flex-shrink-0" />
                            <div className="flex-grow-1 min-w-0">
                              <a
                                href={`/${projectPath}/~commits/${c.hash}`}
                                className="commit-subject font-weight-bold text-body d-block text-truncate"
                              >
                                {c.subject || c.hash.slice(0, 8)}
                              </a>
                              <div className="commit-meta text-muted font-size-sm mt-1">
                                <span className="commit-hash font-monospace">{c.hash.slice(0, 8)}</span>
                                {c.author && (
                                  <>
                                    {" by "}
                                    <span className="commit-author">{c.author.name}</span>
                                    {" on "}
                                    <span className="commit-date">{formatTime(c.author.when)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {activeTab === "changes" && (
                  <>
                    {compareLoading && (
                      <div className="text-muted text-center py-4">
                        <Icon name="loading" className="spin mr-2" />
                        Loading file changes…
                      </div>
                    )}
                    {!compareLoading && diffs.length === 0 && (
                      <div className="text-muted text-center py-4">
                        <Icon name="diff" className="mr-2" />
                        No file changes between {targetBranch} and {sourceBranch}
                      </div>
                    )}
                    {!compareLoading && diffs.length > 0 && (
                      <div className="file-change-list">
                        {diffs.map((d) => (
                          <div key={d.path} className="file-change-item d-flex align-items-center py-2 border-bottom">
                            <Icon name="file" className="icon text-muted mr-2 flex-shrink-0" />
                            <span className="file-path flex-grow-1 text-truncate">{d.path}</span>
                            <span className="file-additions text-success font-monospace font-size-sm ml-2">
                              +{d.additions}
                            </span>
                            <span className="file-deletions text-danger font-monospace font-size-sm ml-1">
                              -{d.deletions}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProjectLayout>
  );
}
