import { Link } from "react-router-dom";
import type { Build } from "../../../api/builds";
import { BuildStatusIcon } from "./BuildStatusIcon";

/**
 * MiniBuildListPanel — compact inline build list.
 * Used in contexts like issue detail sidebar, commit detail, etc.
 *
 * Reference: references/onedev/.../web/component/build/minilist/MiniBuildListPanel.html
 */
export type MiniBuildListPanelProps = {
  builds: Build[];
  projectPath: string;
  /** Build ID that should be highlighted as "active" */
  activeBuildId?: number;
  /** Label shown above the list */
  title?: string;
  /** Link to the full builds list */
  listHref?: string;
};

export function MiniBuildListPanel({
  builds,
  projectPath,
  activeBuildId,
  title = "Builds",
  listHref,
}: MiniBuildListPanelProps) {
  if (builds.length === 0) {
    return null;
  }

  return (
    <div className="simple-build-list">
      <div className="has-builds border rounded">
        {/* Header */}
        <div className="head d-flex align-items-center py-3 px-3 border-bottom">
          <h6 className="mb-0 mr-4">{title}</h6>
          {listHref && (
            <Link
              to={listHref}
              className="show-in-list text-muted"
              title="Show in build list"
            >
              <svg className="icon" viewBox="0 0 24 24" width="16" height="16">
                <path
                  fill="currentColor"
                  d="M19 17H5v-2h14v2m0-6H5v2h14v-2m0-6H5v2h14V5M4 3h16a2 2 0 012 2v14a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2z"
                />
              </svg>
            </Link>
          )}
        </div>

        {/* Build list */}
        <div className="body py-2">
          {builds.map((b) => (
            <Link
              key={b.id}
              to={`/${projectPath}/~builds/${b.number}`}
              className={`build d-flex align-items-center bg-hover-light text-hover-gray-dark px-3 py-2 ${
                b.id === activeBuildId ? "active" : ""
              }`}
            >
              <BuildStatusIcon status={b.status} className="status mr-2" />
              <span className="title">
                {b.jobName} <span className="text-muted">#{b.number}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
