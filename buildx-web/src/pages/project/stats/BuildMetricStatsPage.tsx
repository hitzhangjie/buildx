import { useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";

/**
 * BuildMetricStatsPage — framework page for build metric statistics.
 * Full implementation depends on BuildMetricService, @MetricIndicator annotations,
 * and build report plugins — not yet ported from OneDev.
 *
 * Currently shows the query filter form and a placeholder message.
 * Matches OneDev's BuildMetricStatsPage.java structure.
 */
export default function BuildMetricStatsPage() {
  const { projectPath } = useProject();
  const [query, setQuery] = useState("");

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Build Metric Statistics">
      <div className="build-metric-stats p-2 p-sm-5">
        <div className="card d-flex flex-column flex-grow-1">
          <div className="card-body d-flex flex-column flex-grow-1">
            <form
              className="filter mb-5"
              onSubmit={(e) => {
                e.preventDefault();
                // TODO: parse and apply BuildMetricQuery
              }}
            >
              <div className="input-group">
                <input
                  className="form-control"
                  placeholder="Filter..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button type="submit" className="btn btn-icon">
                  <svg className="icon">
                    <use href="/~icon/magnify.svg#icon" />
                  </svg>
                </button>
              </div>
            </form>
            <div className="content">
              <div className="text-center py-10 text-muted">
                Build metric statistics will be available when build reports are
                configured. This feature depends on the build pipeline and report
                plugin system.
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
}
