import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/onedev/Icon";
import { ProjectLayout } from "../../layout/ProjectLayout";
import { useProject } from "../../context/ProjectContext";
import { fetchProjects } from "../../api/projects";
import { fetchCommit, type RepositoryCommit, type FileDiff } from "../../api/repositories";
import { formatWhen } from "../../util/time";

export function CommitDetailPage() {
  const { projectPath, params } = useProject();
  const commitHash = params.commit;
  const [tab, setTab] = useState<"files" | "diff">("files");

  const [commit, setCommit] = useState<RepositoryCommit | null>(null);
  const [diffs, setDiffs] = useState<FileDiff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectPath || !commitHash) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const projects = await fetchProjects();
        const project = projects.find((p) => p.path === projectPath);
        if (!project) {
          if (!cancelled) setError("Project not found");
          return;
        }

        const c = await fetchCommit(project.id, commitHash!);
        if (!cancelled) {
          setCommit(c);
          setDiffs(c.diffs ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as { message?: string }).message ?? "Failed to load commit");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [projectPath, commitHash]);

  const shortHash = commitHash?.slice(0, 8) ?? "-";

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Commit">
      <div className="commit-detail m-2 m-sm-5">
        {error && <div className="alert alert-light-danger">{error}</div>}

        {loading && (
          <div className="text-center text-muted py-5">Loading…</div>
        )}

        {!loading && commit && (
          <>
            {/* Commit info card */}
            <div className="card info mb-5">
              <ul className="list-group list-group-flush">
                <li className="list-group-item message">
                  <div className="subject d-flex flex-wrap align-items-center">
                    <h4 className="mr-3 mb-0">{commit.subject || commit.hash}</h4>
                    <div className="ml-auto btn-group">
                      <Link
                        to={`/${projectPath}/~files/${commit.hash}`}
                        className="btn btn-sm btn-outline-secondary"
                      >
                        Browse Code
                      </Link>
                    </div>
                  </div>
                  {commit.body && (
                    <pre className="detail mb-0 mt-3">{commit.body}</pre>
                  )}
                </li>
                <li className="list-group-item contribution-and-parents d-flex flex-wrap align-items-center">
                  <div className="contribution">
                    <div className="name">
                      {commit.author && (
                        <span>
                          <Icon name="user" /> {commit.author.name}
                          {commit.author.when > 0 && (
                            <span className="text-muted ml-1">
                              authored {formatWhen(commit.author.when)}
                            </span>
                          )}
                        </span>
                      )}
                      {commit.committer &&
                        commit.committer.name !== commit.author?.name && (
                          <span className="ml-3">
                            <Icon name="user" /> {commit.committer.name}
                            {commit.committer.when > 0 && (
                              <span className="text-muted ml-1">
                                committed {formatWhen(commit.committer.when)}
                              </span>
                            )}
                          </span>
                        )}
                      {commit.committer &&
                        commit.committer.name === commit.author?.name &&
                        commit.committer.when !== commit.author?.when && (
                          <span className="text-muted ml-1">
                            committed {formatWhen(commit.committer.when)}
                          </span>
                        )}
                    </div>
                  </div>
                  <div className="commit ml-5">
                    <span className="hash font-size-sm">{shortHash}</span>
                    <button
                      className="copy btn btn-xs btn-icon btn-light btn-hover-primary"
                      title="Copy hash"
                      onClick={() => {
                        void navigator.clipboard.writeText(commit.hash);
                      }}
                    >
                      <Icon name="copy" />
                    </button>
                  </div>
                  {commit.parentHashes && commit.parentHashes.length > 0 && (
                    <div className="parents ml-4">
                      <span className="text-muted mr-2">
                        {commit.parentHashes.length}{" "}
                        {commit.parentHashes.length === 1 ? "parent" : "parents"}
                      </span>
                      {commit.parentHashes.map((p) => (
                        <Link
                          key={p}
                          to={`/${projectPath}/~commits/${p}`}
                          className="badge badge-light-secondary mr-1"
                        >
                          {p.slice(0, 8)}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              </ul>
            </div>

            {/* Tabs and diff content */}
            <div className="card changes p-5">
              <ul className="nav nav-tabs nav-tabs-line nav-tabs-line-2x mb-4">
                <li className="nav-item">
                  <a
                    href="#"
                    className={`nav-link${tab === "files" ? " active" : ""}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setTab("files");
                    }}
                  >
                    Files Changed
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    href="#"
                    className={`nav-link${tab === "diff" ? " active" : ""}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setTab("diff");
                    }}
                  >
                    Diff
                  </a>
                </li>
              </ul>

              {tab === "files" && (
                <table className="table mb-0">
                  <thead>
                    <tr>
                      <th>File</th>
                      <th className="text-right">Changes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffs.map((file) => (
                      <tr key={file.path}>
                        <td>
                          <code className="text-primary">{file.path}</code>
                        </td>
                        <td className="text-right text-nowrap">
                          <span className="text-success mr-2">+{file.additions}</span>
                          <span className="text-danger">-{file.deletions}</span>
                        </td>
                      </tr>
                    ))}
                    {diffs.length === 0 && (
                      <tr>
                        <td colSpan={2} className="text-center text-muted py-5">
                          No files changed
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {tab === "diff" && (
                <div>
                  {diffs.length === 0 && (
                    <div className="text-center text-muted py-5">
                      No changes to display
                    </div>
                  )}
                  {diffs.map((file) => (
                    <div key={file.path} className="mb-4">
                      <div className="font-weight-bold mb-2 text-primary">
                        {file.path}
                      </div>
                      <pre
                        className="bg-light p-3 font-size-xs"
                        style={{
                          maxHeight: 600,
                          overflow: "auto",
                          whiteSpace: "pre",
                          fontFamily: "monospace",
                          lineHeight: 1.5,
                        }}
                      >
                        <code>{file.diff}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {!loading && !commit && !error && (
          <div className="text-center text-muted py-5">Commit not found</div>
        )}
      </div>
    </ProjectLayout>
  );
}
