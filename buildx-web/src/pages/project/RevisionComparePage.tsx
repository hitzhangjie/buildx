import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "../../components/onedev/Icon";
import { CompareRevisionPicker } from "../../components/onedev/panels/CompareRevisionPicker";
import { RevisionDiffPanel } from "../../components/onedev/panels/RevisionDiffPanel";
import { ProjectLayout } from "../../layout/ProjectLayout";
import { useProject } from "../../context/ProjectContext";
import { fetchCompare, type CompareResult, type WhitespaceOption } from "../../api/compare";
import { fetchCompareCodeComments, type CodeComment } from "../../api/codeComments";
import { fetchDefaultBranch, fetchBranches, type RepositoryCommit } from "../../api/repositories";
import { fetchProjects } from "../../api/projects";
import { formatWhen } from "../../util/time";
import "./revision-compare-page.css";

type CompareTab = "COMMITS" | "FILE_CHANGES";

function formatCommitWhen(commit: RepositoryCommit): string {
  const when = commit.committer?.when ?? commit.author?.when;
  return when ? formatWhen(when) : "";
}

function isBranchName(revision: string, branches: string[]): boolean {
  return branches.includes(revision);
}

export function RevisionComparePage() {
  const { projectPath } = useProject();
  const [searchParams, setSearchParams] = useSearchParams();

  const [projectId, setProjectId] = useState<number | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [initDone, setInitDone] = useState(false);

  const left = searchParams.get("left") ?? "";
  const right = searchParams.get("right") ?? "";
  const compareWithMergeBase = searchParams.get("compare-with-merge-base") !== "false";
  const tab = (searchParams.get("tab")?.toUpperCase() as CompareTab) || "COMMITS";
  const pathFilter = searchParams.get("path-filter") ?? "";
  const commitQuery = searchParams.get("commit-query") ?? "";
  const whitespaceOption =
    (searchParams.get("whitespace-option")?.toUpperCase() as WhitespaceOption) || "IGNORE_TRAILING";
  const commentIdParam = searchParams.get("comment");
  const activeCommentId = commentIdParam ? Number(commentIdParam) : null;

  const [compare, setCompare] = useState<CompareResult | null>(null);
  const [codeComments, setCodeComments] = useState<CodeComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      setSearchParams(next, { replace: false });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    if (!projectPath) return;
    let cancelled = false;

    async function init() {
      try {
        const projects = await fetchProjects();
        const project = projects.find((p) => p.path === projectPath);
        if (!project) {
          if (!cancelled) setError("Project not found");
          return;
        }
        if (!cancelled) setProjectId(project.id);

        const branch = await fetchDefaultBranch(project.id);
        if (!cancelled && !searchParams.get("left") && !searchParams.get("right") && branch) {
          updateParams({ left: branch, right: branch });
        }

        const branchNames = await fetchBranches(project.id);
        if (!cancelled) setBranches(branchNames);
      } catch (err) {
        if (!cancelled) {
          setError((err as { message?: string }).message ?? "Failed to initialize compare");
        }
      } finally {
        if (!cancelled) setInitDone(true);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
    // Only run on project change; URL defaults applied once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectPath]);

  useEffect(() => {
    if (!projectId || !left || !right || !initDone) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchCompare(projectId!, {
          left,
          right,
          compareWithMergeBase,
          includeCommits: tab === "COMMITS",
          includeDiffs: tab === "FILE_CHANGES",
          includeEffectivePullRequest:
            isBranchName(left, branches) && isBranchName(right, branches),
          pathFilter: tab === "FILE_CHANGES" ? pathFilter : undefined,
          whitespaceOption,
        });
        if (!cancelled) setCompare(result);
      } catch (err) {
        if (!cancelled) {
          setCompare(null);
          setError((err as { message?: string }).message ?? "Failed to compare revisions");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId, left, right, compareWithMergeBase, tab, pathFilter, whitespaceOption, initDone, branches]);

  const mergeBase = compare?.mergeBase;
  const diffOldRevision =
    compareWithMergeBase && mergeBase
      ? mergeBase.commitHash
      : compare?.left.commitHash ?? "";

  useEffect(() => {
    if (!projectPath || !compare?.right.commitHash || !diffOldRevision) {
      setCodeComments([]);
      return;
    }
    let cancelled = false;
    void fetchCompareCodeComments(projectPath, diffOldRevision, compare.right.commitHash)
      .then((items) => {
        if (!cancelled) setCodeComments(items);
      })
      .catch(() => {
        if (!cancelled) setCodeComments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [projectPath, diffOldRevision, compare?.right.commitHash]);

  useEffect(() => {
    if (commentIdParam && tab !== "FILE_CHANGES") {
      updateParams({ tab: "FILE_CHANGES" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentIdParam]);

  const revisionsSpecified = Boolean(left && right && compare?.left.commitHash && compare?.right.commitHash);
  const unrelatedHistory = revisionsSpecified && !mergeBase;
  const showResults = revisionsSpecified && mergeBase != null;

  const filteredCommits = useMemo(() => {
    const commits = compare?.commits ?? [];
    if (!commitQuery.trim()) return commits;
    const q = commitQuery.toLowerCase();
    return commits.filter((c) => {
      const haystack = `${c.subject ?? ""} ${c.hash} ${c.author?.name ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [compare?.commits, commitQuery]);

  const showMergeBaseCheckbox =
    mergeBase != null && compare?.left.commitHash !== mergeBase.commitHash;

  const showCreatePR =
    !compare?.effectivePullRequest &&
    mergeBase != null &&
    compare?.right.commitHash !== mergeBase.commitHash &&
    isBranchName(left, branches) &&
    isBranchName(right, branches);

  const effectivePR = compare?.effectivePullRequest;
  const showEffectivePR =
    effectivePR != null &&
    (effectivePR.status === "OPEN" || effectivePR.status === "MERGED");

  const commitsWithMergeBase =
    !compareWithMergeBase &&
    mergeBase != null &&
    compare?.left.commitHash !== mergeBase.commitHash;

  function handleSwap() {
    updateParams({ left: right, right: left });
  }

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Code Compare">
      <div className="RevisionComparePage">
        <div className="p-2 p-sm-5">
          <div className="revision-compare mb-5">
            <div className="base revision card">
              <div className="card-body">
                <div className="head">
                  <div className="title">Base</div>
                  {showMergeBaseCheckbox && (
                    <>
                      <label className="checkbox mb-0">
                        <input
                          type="checkbox"
                          checked={compareWithMergeBase}
                          onChange={() =>
                            updateParams({
                              "compare-with-merge-base": compareWithMergeBase ? "false" : "true",
                            })
                          }
                        />{" "}
                        common ancestor
                      </label>
                      <span
                        className="help"
                        title="Check this to compare right side with common ancestor of left and right"
                      >
                        <Icon name="question-circle-o" className="icon" />
                      </span>
                    </>
                  )}
                </div>
                <CompareRevisionPicker
                  projectPath={projectPath}
                  revision={left}
                  onSelect={(revision) => updateParams({ left: revision })}
                />
                {compare?.left.subject && (
                  <Link
                    to={`/${projectPath}/~commits/${compare.left.commitHash}`}
                    className="message d-block"
                  >
                    <span>{compare.left.subject}</span>
                  </Link>
                )}
              </div>
            </div>

            <div className="swap">
              <button
                type="button"
                className="btn btn-primary btn-icon"
                title="Swap"
                onClick={handleSwap}
              >
                <Icon name="swap" />
              </button>
            </div>

            <div className="compare revision card">
              <div className="card-body">
                <div className="title">Compare</div>
                <CompareRevisionPicker
                  projectPath={projectPath}
                  revision={right}
                  onSelect={(revision) => updateParams({ right: revision })}
                />
                {compare?.right.subject && (
                  <Link
                    to={`/${projectPath}/~commits/${compare.right.commitHash}`}
                    className="message d-block"
                  >
                    <span>{compare.right.subject}</span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {showEffectivePR && effectivePR && (
            <div className="alert alert-notice alert-light-success mb-5">
              <span>
                {effectivePR.status === "OPEN" ? (
                  <>
                    This change is already opened for merge by pull request{" "}
                    <Link to={`/${projectPath}/~pulls/${effectivePR.number}`}>
                      #{effectivePR.number}
                    </Link>
                  </>
                ) : (
                  <>
                    This change is squashed/rebased onto base branch via pull request{" "}
                    <Link to={`/${projectPath}/~pulls/${effectivePR.number}`}>
                      #{effectivePR.number}
                    </Link>
                  </>
                )}
              </span>
            </div>
          )}

          {showCreatePR && (
            <Link
              to={`/${projectPath}/~pulls/new?source=${encodeURIComponent(right)}&target=${encodeURIComponent(left)}`}
              className="btn btn-primary btn-block mb-5"
            >
              <Icon name="plus" className="icon mr-2" />
              Create Pull Request for This Change
            </Link>
          )}

          {!revisionsSpecified && initDone && (
            <div className="alert alert-notice alert-light-warning mb-5">
              <span>Please select revisions to compare</span>
            </div>
          )}

          {unrelatedHistory && (
            <div className="alert alert-notice alert-light-warning mb-5">
              <span>History of comparing revisions is unrelated</span>
            </div>
          )}

          {error && <div className="alert alert-light-danger mb-5">{error}</div>}

          {showResults && (
            <div className="card compare-result">
              <div className="card-body">
                <ul className="nav nav-tabs nav-tabs-line nav-bolder mb-5">
                  <li className="nav-item">
                    <a
                      href="#"
                      className={`nav-link${tab === "COMMITS" ? " active" : ""}`}
                      onClick={(e) => {
                        e.preventDefault();
                        updateParams({ tab: "COMMITS" });
                      }}
                    >
                      Commits
                    </a>
                  </li>
                  <li className="nav-item">
                    <a
                      href="#"
                      className={`nav-link${tab === "FILE_CHANGES" ? " active" : ""}`}
                      onClick={(e) => {
                        e.preventDefault();
                        updateParams({ tab: "FILE_CHANGES" });
                      }}
                    >
                      File Changes
                    </a>
                  </li>
                </ul>

                <div className="tab-panel">
                  {tab === "COMMITS" && (
                    <div className={`commit-list no-autofocus${commitsWithMergeBase ? " with-merge-base" : ""}`}>
                      <div className="d-flex mb-4">
                        <form
                          className="clearable-wrapper flex-grow-1"
                          onSubmit={(e) => e.preventDefault()}
                        >
                          <div className="input-group">
                            <input
                              spellCheck={false}
                              autoComplete="off"
                              className="form-control"
                              placeholder="Query/order commits"
                              value={commitQuery}
                              onChange={(e) =>
                                updateParams({ "commit-query": e.target.value || null })
                              }
                            />
                            <span className="input-group-append">
                              <button
                                type="submit"
                                className="btn btn-outline-secondary btn-icon"
                                title="Query"
                              >
                                <Icon name="magnify" />
                              </button>
                            </span>
                          </div>
                        </form>
                      </div>

                      {loading && (
                        <div className="text-center text-muted py-5">Loading commits…</div>
                      )}

                      {!loading && (
                        <table className="table">
                          <tbody>
                            {filteredCommits.map((commit) => (
                              <tr key={commit.hash}>
                                <td>
                                  <div className="d-flex flex-wrap align-items-center">
                                    <Link
                                      to={`/${projectPath}/~commits/${commit.hash}`}
                                      className="font-weight-bold mr-2"
                                    >
                                      {commit.subject || commit.hash}
                                    </Link>
                                    <span className="badge badge-light-secondary font-size-xs mr-2">
                                      {commit.hash.slice(0, 8)}
                                    </span>
                                  </div>
                                  <div className="text-muted font-size-sm mt-1">
                                    <Icon name="user" /> {commit.author?.name ?? "Unknown"}
                                    <span className="mx-2">|</span>
                                    {formatCommitWhen(commit)}
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {filteredCommits.length === 0 && (
                              <tr>
                                <td className="text-center text-muted py-5">No commits found</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {tab === "FILE_CHANGES" && projectId != null && (
                    <RevisionDiffPanel
                      projectPath={projectPath}
                      projectId={projectId}
                      oldRevision={diffOldRevision}
                      newRevision={compare?.right.commitHash ?? ""}
                      rightRevisionLabel={right}
                      diffs={compare?.diffs ?? []}
                      comments={codeComments}
                      pathFilter={pathFilter}
                      whitespaceOption={whitespaceOption}
                      activeCommentId={activeCommentId}
                      onPathFilterChange={(value) =>
                        updateParams({ "path-filter": value || null })
                      }
                      onWhitespaceOptionChange={(value) =>
                        updateParams({
                          "whitespace-option":
                            value === "IGNORE_TRAILING" ? null : value,
                        })
                      }
                      onCommentSelect={(id) =>
                        updateParams({ comment: id != null ? String(id) : null })
                      }
                      loading={loading}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProjectLayout>
  );
}
