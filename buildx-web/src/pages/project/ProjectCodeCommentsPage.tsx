import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/onedev/Icon";
import { QueryListLayout } from "../../components/onedev/panels/QueryListLayout";
import type { ListToolbarAction } from "../../components/onedev/panels/ResourcefulListPanel";
import type { SavedQuery } from "../../components/onedev/panels/SavedQueriesPanel";
import { ProjectLayout } from "../../layout/ProjectLayout";
import { useProject } from "../../context/ProjectContext";
import { fetchProjectCodeComments, type CodeComment } from "../../api/codeComments";
import { useAuth } from "../../context/AuthContext";
import { buildProjectScopedHref } from "../../data/queryPresets";
import { sourcePositionFromRange } from "../../util/planarRange";
import { formatWhen } from "../../util/time";
import "./project-code-comments-page.css";

type QueryPreset = "unresolved" | "created-by-me" | "mentioned-me" | "created-recently" | "active-recently" | "resolved" | "all";

const QUERY_PRESETS: Array<{ key: QueryPreset; label: string }> = [
  { key: "unresolved", label: "Unresolved" },
  { key: "created-by-me", label: "Created by me" },
  { key: "mentioned-me", label: "Mentioned me" },
  { key: "created-recently", label: "Created recently" },
  { key: "active-recently", label: "Has activity recently" },
  { key: "resolved", label: "Resolved" },
  { key: "all", label: "All" },
];

const PRESET_QUERY_TEXT: Record<QueryPreset, string> = {
  unresolved: "unresolved",
  "created-by-me": "created by me",
  "mentioned-me": "mentioned me",
  "created-recently": "created recently",
  "active-recently": "has activity recently",
  resolved: "resolved",
  all: "",
};

const CODE_COMMENT_COMMON_QUERIES: SavedQuery[] = QUERY_PRESETS.map((preset) => ({
  name: preset.label,
  query: PRESET_QUERY_TEXT[preset.key],
}));

const DEFAULT_TOOLBAR: ListToolbarAction[] = [
  { icon: "filter", label: "Filter" },
  { icon: "sort", label: "Order By" },
  { icon: "ellipsis-circle", label: "Operations" },
];

export function ProjectCodeCommentsPage() {
  const { projectPath } = useProject();
  const { user } = useAuth();
  const [query, setQuery] = useState("unresolved");
  const [activePreset, setActivePreset] = useState<QueryPreset>("unresolved");
  const [comments, setComments] = useState<CodeComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchProjectCodeComments(projectPath)
      .then((items) => {
        if (!cancelled) {
          setComments(items);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setComments([]);
          setError((err as { message?: string }).message ?? "Failed to load code comments");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  const filtered = useMemo(
    () =>
      comments.filter((c) => {
        if (activePreset === "unresolved" && c.resolved) {
          return false;
        }
        if (activePreset === "resolved" && !c.resolved) {
          return false;
        }
        if (activePreset === "created-by-me" && user && c.user?.id !== user.id) {
          return false;
        }
        if (activePreset === "mentioned-me" && user) {
          const mention = `@${user.name}`.toLowerCase();
          if (!c.content.toLowerCase().includes(mention)) {
            return false;
          }
        }
        if (activePreset === "created-recently" || activePreset === "active-recently") {
          const ageMs = Date.now() - new Date(c.createDate).getTime();
          if (ageMs > 14 * 24 * 60 * 60 * 1000) {
            return false;
          }
        }

        const q = query.trim().toLowerCase();
        if (
          q === "" ||
          q === "unresolved" ||
          q === "resolved" ||
          q === "all" ||
          q === "created by me" ||
          q === "mentioned me" ||
          q === "created recently" ||
          q === "has activity recently"
        ) {
          return true;
        }
        if (!q) {
          return true;
        }
        const file = c.mark.path.toLowerCase();
        const content = c.content.toLowerCase();
        const author = (c.user?.fullName ?? c.user?.name ?? "").toLowerCase();
        return file.includes(q) || content.includes(q) || author.includes(q);
      }),
    [activePreset, comments, query, user],
  );

  const ordered = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => new Date(b.createDate).getTime() - new Date(a.createDate).getTime(),
      ),
    [filtered],
  );

  function handleSelectQuery(nextQuery: string) {
    setQuery(nextQuery);
    const preset = QUERY_PRESETS.find((item) => PRESET_QUERY_TEXT[item.key] === nextQuery);
    setActivePreset(preset?.key ?? "all");
  }

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Code Comments">
      <div className="project-code-comments-page d-flex flex-grow-1 p-3">
        <QueryListLayout
          className="side-main side-main-wrap flex-grow-1"
          storageKey={`code-comments:project:${projectPath}`}
          commonQueries={CODE_COMMENT_COMMON_QUERIES}
          currentQuery={query}
          onSelectQuery={handleSelectQuery}
          buildHref={(q) => buildProjectScopedHref(`/${projectPath}/~code-comments`, q)}
        >
          {(savedQueries) => (
            <div className="comments-main card mb-0 flex-grow-1">
              <div className="card-body p-3">
                <div className="query-toolbar mb-3">
                  <form className="clearable-wrapper" onSubmit={(e) => e.preventDefault()}>
                    <div className="input-group">
                      <input
                        spellCheck={false}
                        className="form-control"
                        placeholder="Query/order code comments"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      <span className="input-group-append">
                        <button type="button" className="btn btn-outline-secondary btn-icon" title="Clear" onClick={() => setQuery("")}>
                          <Icon name="times" />
                        </button>
                        <button type="submit" className="btn btn-outline-secondary btn-icon" title="Query">
                          <Icon name="magnify" />
                        </button>
                      </span>
                    </div>
                  </form>
                  <div className="toolbar-links text-muted font-size-sm mt-2 d-flex align-items-center flex-wrap">
                    {[...savedQueries.toolbarActions, ...DEFAULT_TOOLBAR].map((action) => (
                      <a
                        key={action.label}
                        href={action.href ?? "#"}
                        className={`mr-4 ${action.className ?? ""}`}
                        onClick={(e) => {
                          if (!action.href) {
                            e.preventDefault();
                          }
                          action.onClick?.();
                        }}
                      >
                        <Icon name={action.icon} /> {action.label}
                      </a>
                    ))}
                    <span className="ml-auto">
                      found {ordered.length} comment{ordered.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>

                <div className="code-comment-list">
              {ordered.map((comment) => {
                const row = (comment.mark.range?.fromRow ?? 0) + 1;
                const position = comment.mark.range ? sourcePositionFromRange(comment.mark.range) : null;
                const link = `/${projectPath}/~files/${comment.mark.commitHash}/${comment.mark.path}${
                  position ? `?position=${encodeURIComponent(position)}&comment=${comment.id}` : ""
                }`;
                const author = comment.user?.fullName ?? comment.user?.name ?? "Unknown";
                return (
                  <Link
                    key={comment.id}
                    className="code-comment-list-item d-flex py-3 border-top"
                    to={link}
                  >
                    <div className={`comment-state-dot mt-1 mr-3 ${comment.resolved ? "resolved" : "open"}`} />
                    <div className="flex-grow-1 min-width-0">
                      <div className="mb-1">
                        <span className="font-weight-bold mr-2 text-body">
                          @{comment.user?.name ?? "unknown"} {comment.content}
                        </span>
                      </div>
                      <div className="font-size-sm text-muted">
                        {author} added {formatWhen(new Date(comment.createDate).getTime())} on file{" "}
                        <code>{comment.mark.path}</code>:<span>{row}</span>
                        {comment.replyCount > 0 && (
                          <span className="ml-2">({comment.replyCount} repl{comment.replyCount > 1 ? "ies" : "y"})</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
              {ordered.length === 0 && (
                <div className="text-center text-muted py-5">
                  {loading ? "Loading code comments..." : "No code comments found"}
                </div>
              )}
            </div>
            {error && <div className="alert alert-light-danger mt-3 mb-0">{error}</div>}
              </div>
            </div>
          )}
        </QueryListLayout>
      </div>
    </ProjectLayout>
  );
}
