import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import type { Project } from "../../../api/projects";
import { FormFeedbackPanel } from "../FormFeedbackPanel";

function OdIcon({ name, className = "icon" }: { name: string; className?: string }) {
  return <img src={`/~icon/${name}.svg`} alt="" className={className} width={16} height={16} />;
}

type ProjectListPanelProps = {
  projects: Project[];
  loading: boolean;
  errors?: string[];
  query?: string;
  onQueryChange?: (query: string) => void;
};

/**
 * Mirrors OneDev ProjectListPanel.html.
 * Reference: references/onedev/.../web/component/project/list/ProjectListPanel.html
 */
export function ProjectListPanel({
  projects,
  loading,
  errors = [],
  query = "",
  onQueryChange,
}: ProjectListPanelProps) {
  const [inputQuery, setInputQuery] = useState(query);

  function handleQuerySubmit(e: FormEvent) {
    e.preventDefault();
    onQueryChange?.(inputQuery);
  }

  return (
    <div className="project-list card no-autofocus">
      <div className="card-body">
        <div className="d-flex mb-4">
          <form className="clearable-wrapper flex-grow-1" onSubmit={handleQuerySubmit}>
            <div className="input-group">
              <input
                spellCheck={false}
                autoComplete="off"
                className="form-control"
                placeholder="Query/order projects"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
              />
              <span className="input-group-append">
                <button
                  type="submit"
                  className="btn btn-outline-secondary btn-icon"
                  title="Query"
                  aria-label="Query"
                >
                  <OdIcon name="magnify" />
                </button>
              </span>
            </div>
          </form>
          <Link to="/~projects/new" className="btn btn-primary btn-icon flex-shrink-0 ml-3" title="New project">
            <OdIcon name="plus" />
          </Link>
        </div>
        <div className="operations mb-4">
          <a href="#saved-queries" className="show-saved-queries text-gray d-inline-block mb-2 mr-4">
            <OdIcon name="eye" /> Show Saved Queries
          </a>
          <span className="save-query text-gray d-inline-block mb-2 mr-4 opacity-50">
            <OdIcon name="save" /> Save Query
          </span>
          <span className="filter text-gray mr-4 mb-2 d-inline-block text-nowrap opacity-50">
            <OdIcon name="filter" /> Filter
          </span>
          <span className="order-by text-gray d-inline-block mb-2 mr-4 opacity-50">
            <OdIcon name="sort" /> Order By
          </span>
          <span className="operations d-inline-block mb-2 mr-4 text-gray opacity-50">
            <OdIcon name="ellipsis-circle" /> Operations
          </span>
          <Link to="/~projects/import/stub" className="import-projects d-inline-block mb-2 mr-4 text-gray">
            <OdIcon name="import" /> Import
          </Link>
          <span className="float-right text-gray">{loading ? "…" : projects.length}</span>
        </div>
        <div>
          <FormFeedbackPanel messages={errors} />
          {loading ? (
            <div className="text-center py-10 text-muted">Loading…</div>
          ) : (
            <table className="table">
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <div className="d-flex align-items-center flex-wrap row-gap-2 font-size-h5">
                        <Link to={`/${project.path}`} className="mr-2">
                          <img
                            src="/~icon/project.svg"
                            alt=""
                            className="icon mr-2"
                            width={20}
                            height={20}
                          />
                          <span>{project.path}</span>
                        </Link>
                      </div>
                      {project.name && project.name !== project.path && (
                        <div className="mt-1 font-size-sm text-muted">{project.name}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
