import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/onedev/Icon";
import { ProjectLayout } from "../../layout/ProjectLayout";
import { useProject } from "../../context/ProjectContext";
import { fetchProjects } from "../../api/projects";
import { fetchTag, fetchTags } from "../../api/repositories";

interface Tag {
  name: string;
  commit: string;
  date: string;
  message: string;
}

export function ProjectTagsPage() {
  const { projectPath } = useProject();
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectPath) {
      return;
    }
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const projects = await fetchProjects();
        const project = projects.find((item) => item.path === projectPath);
        if (!project) {
          if (!cancelled) {
            setTags([]);
            setError("Project not found");
          }
          return;
        }

        const names = await fetchTags(project.id);
        const details = await Promise.all(names.map((name) => fetchTag(project.id, name)));

        if (!cancelled) {
          setTags(
            names.map((name, index) => ({
              name,
              commit: details[index].commitHash.slice(0, 8),
              date: details[index].updated ?? "",
              message: details[index].message ?? "",
            })),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as { message?: string }).message ?? "Failed to load tags");
          setTags([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  const filtered = tags.filter(
    (t) => !query || t.name.toLowerCase().includes(query.toLowerCase()) || t.message.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Tags">
      <div className="card m-3">
        <div className="card-body">
          <div className="d-flex mb-4">
            <form className="clearable-wrapper flex-grow-1" onSubmit={(e) => e.preventDefault()}>
              <div className="input-group">
                <input
                  spellCheck={false}
                  className="form-control"
                  placeholder="Query/order tags"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <span className="input-group-append">
                  <button type="submit" className="btn btn-outline-secondary btn-icon" title="Query">
                    <Icon name="magnify" />
                  </button>
                </span>
              </div>
            </form>
            <button className="btn btn-primary btn-icon flex-shrink-0 ml-3" title="Create tag" disabled>
              <Icon name="plus" />
            </button>
          </div>
          {error && <div className="alert alert-light-danger">{error}</div>}
          <table className="table">
            <thead>
              <tr>
                <th>Tag</th>
                <th>Commit</th>
                <th>Message</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-5">Loading…</td>
                </tr>
              )}
              {!loading && filtered.map((tag) => (
                <tr key={tag.name}>
                  <td>
                    <div className="d-flex align-items-center">
                      <Icon name="tag" />
                      <span className="font-weight-bold ml-2">{tag.name}</span>
                    </div>
                  </td>
                  <td>
                    <Link to={`/${projectPath}/~commits/${tag.commit}`} className="text-muted">
                      {tag.commit}
                    </Link>
                  </td>
                  <td className="text-muted">{tag.message}</td>
                  <td className="text-muted">{tag.date}</td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-5">No tags found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ProjectLayout>
  );
}
