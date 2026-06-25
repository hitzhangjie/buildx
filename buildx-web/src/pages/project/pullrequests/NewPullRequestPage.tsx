import { type FormEvent, useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { useProject } from "../../../context/ProjectContext";
import {
  createPullRequest,
  mergeStrategyLabel,
  type CreatePullRequestRequest,
} from "../../../api/pullRequests";
import { fetchBranches, fetchDefaultBranch } from "../../../api/repositories";
import { fetchProjects } from "../../../api/projects";
import { BranchSelector, type BranchSelection } from "../../../components/onedev/panels/BranchSelector";
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
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

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
    return () => {
      cancelled = true;
    };
  }, [projectId, searchParams]);

  // Compute status fragment.
  useEffect(() => {
    if (!targetBranch.trim() || !sourceBranch.trim()) {
      setStatusFragment("branchNotSpecified");
      return;
    }
    if (targetBranch === sourceBranch && targetProjectId === sourceProjectId) {
      setStatusFragment("sameBranch");
      return;
    }
    // For now, assume branches are valid (the server will validate further).
    setStatusFragment("canSend");
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

  async function handleSubmit(e: FormEvent) {
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
      };
      const id = await createPullRequest(req);
      // Fetch the created PR to get its number.
      const { fetchPullRequest } = await import("../../../api/pullRequests");
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

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="New Pull Request">
      <div className="p-5 new-pull-request">
        {/* ---- Revision Compare ---- */}
        <div className="revision-compare mb-5 d-flex align-items-start justify-content-center">
          <div className="base revision card">
            <div className="card-body">
              <div className="title mb-2 font-weight-bold">Target</div>
              <div className="selector">
                <BranchSelector
                  defaultProjectPath={projectPath}
                  revision={targetBranch}
                  onSelect={handleTargetSelect}
                  label="Target Branch"
                />
              </div>
              <div className="message text-muted font-size-sm mt-2">
                {targetBranch || "Select target branch"}
              </div>
            </div>
          </div>

          <div className="swap d-flex align-items-center mx-3" style={{ marginTop: "2rem" }}>
            <button
              type="button"
              className="btn btn-primary btn-icon"
              onClick={handleSwap}
              title="Swap source and target"
            >
              <Icon name="swap" />
            </button>
          </div>

          <div className="compare revision card">
            <div className="card-body">
              <div className="title mb-2 font-weight-bold">Source</div>
              <div className="selector">
                <BranchSelector
                  defaultProjectPath={projectPath}
                  revision={sourceBranch}
                  onSelect={handleSourceSelect}
                  label="Source Branch"
                />
              </div>
              <div className="message text-muted font-size-sm mt-2">
                {sourceBranch || "Select source branch"}
              </div>
            </div>
          </div>
        </div>

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
          {statusFragment === "effective" && (
            <div className="alert alert-notice alert-light-success shadow mb-5">
              <span>A pull request already exists for these changes.</span>{" "}
              <a href={`/${projectPath}/~pulls`}>View pull requests</a>
            </div>
          )}
        </div>

        {/* ---- Preview Tabs (Commits / File Changes) ---- */}
        {statusFragment === "canSend" && targetBranch && sourceBranch && (
          <div className="card mb-5">
            <div className="card-body">
              <ul className="nav nav-tabs nav-tabs-line nav-bolder mb-4">
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
                  </a>
                </li>
              </ul>
              <div className="tab-panel">
                {activeTab === "commits" && (
                  <div className="text-muted text-center py-4">
                    <Icon name="commit" className="mr-2" />
                    Commits between <strong>{targetBranch}</strong> and <strong>{sourceBranch}</strong>{" "}
                    will be shown here
                  </div>
                )}
                {activeTab === "changes" && (
                  <div className="text-muted text-center py-4">
                    <Icon name="diff" className="mr-2" />
                    File changes between <strong>{targetBranch}</strong> and{" "}
                    <strong>{sourceBranch}</strong> will be shown here
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
                      {/* Merge preview would go here if we can compute it */}
                    </div>
                  </div>
                </div>

                {/* Reviewers info */}
                <div className="form-group">
                  <label>Reviewers</label>
                  <div className="text-muted form-text">
                    Reviewers can be added after creating the pull request.
                  </div>
                </div>

                {/* Assignees info */}
                <div className="form-group">
                  <label>Assignees</label>
                  <div className="text-muted form-text">
                    Assignees can be added after creating the pull request.
                    Assignees have code write permission and will be responsible for merging the
                    pull request.
                  </div>
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
      </div>
    </ProjectLayout>
  );
}
