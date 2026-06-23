import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import {
  SavedQueriesPanel,
  type SavedQuery,
} from "../../../components/onedev/panels/SavedQueriesPanel";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";

interface IssueItem {
  id: number;
  number: number;
  title: string;
  state: string;
  stateColor: "light-warning" | "light-primary" | "light-success";
  votes: number;
  comments: number;
  submitter: string;
  date: string;
}

const MOCK_ISSUES: IssueItem[] = [
  {
    id: 1,
    number: 1,
    title: "Setup CI pipeline",
    state: "Open",
    stateColor: "light-warning",
    votes: 2,
    comments: 3,
    submitter: "admin",
    date: "2026-06-20",
  },
  {
    id: 2,
    number: 2,
    title: "Fix login redirect",
    state: "In Progress",
    stateColor: "light-primary",
    votes: 1,
    comments: 1,
    submitter: "admin",
    date: "2026-06-21",
  },
  {
    id: 3,
    number: 3,
    title: "Add dark mode support",
    state: "Open",
    stateColor: "light-warning",
    votes: 5,
    comments: 0,
    submitter: "alice",
    date: "2026-06-22",
  },
  {
    id: 4,
    number: 4,
    title: "Refactor API client",
    state: "Done",
    stateColor: "light-success",
    votes: 0,
    comments: 2,
    submitter: "bob",
    date: "2026-06-19",
  },
];

const MOCK_PERSONAL_QUERIES: SavedQuery[] = [
  { name: "My open issues", query: "state:open submitter:me", href: "" },
  { name: "Assigned to me", query: "assignee:me state:open", href: "" },
];

const MOCK_COMMON_QUERIES: SavedQuery[] = [
  { name: "All open", query: "state:open", href: "" },
  { name: "In Progress", query: 'state:"In Progress"', href: "" },
];

/**
 * Mirrors OneDev ProjectIssueListPage.
 * Reference: references/onedev/.../web/page/project/issues/list/ProjectIssueListPage.html
 */
export function ProjectIssueListPage() {
  const { projectPath } = useProject();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("query") ?? "";
  const [queryInput, setQueryInput] = useState(query);

  function handleQuerySubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (queryInput.trim()) {
      next.set("query", queryInput.trim());
    } else {
      next.delete("query");
    }
    setSearchParams(next, { replace: true });
  }

  const filtered = MOCK_ISSUES.filter(
    (issue) =>
      !query ||
      issue.title.toLowerCase().includes(query.toLowerCase()) ||
      issue.state.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Issues">
      <div className="d-flex flex-grow-1">
        <SavedQueriesPanel
          personalQueries={MOCK_PERSONAL_QUERIES}
          commonQueries={MOCK_COMMON_QUERIES}
          currentQuery={query}
        />
        <div className="flex-grow-1 p-3">
          <div className="card">
            <div className="card-body">
              <div className="d-flex mb-4">
                <form
                  className="clearable-wrapper flex-grow-1"
                  onSubmit={handleQuerySubmit}
                >
                  <div className="input-group">
                    <input
                      spellCheck={false}
                      className="form-control"
                      placeholder="Query/order issues"
                      value={queryInput}
                      onChange={(e) => setQueryInput(e.target.value)}
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
                <Link
                  to={`/${projectPath}/~issues/new`}
                  className="btn btn-primary ml-3 font-weight-bold"
                >
                  <Icon name="plus" /> Create new issue
                </Link>
              </div>
              <div className="d-flex align-items-center mb-3">
                <div className="text-muted font-size-sm mr-3">
                  {filtered.length} issue
                  {filtered.length !== 1 ? "s" : ""}
                </div>
                <div className="btn-group btn-group-sm">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    title="Show Saved Queries"
                  >
                    <Icon name="eye" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    title="Save Query"
                  >
                    <Icon name="save" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    title="Filter"
                  >
                    <Icon name="filter" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    title="Order By"
                  >
                    <Icon name="sort" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    title="Operations"
                  >
                    <Icon name="cog" />
                  </button>
                </div>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Issue</th>
                    <th>State</th>
                    <th>Votes</th>
                    <th>Comments</th>
                    <th>Submitter</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((issue) => (
                    <tr key={issue.id}>
                      <td>
                        <Link
                          to={`/${projectPath}/~issues/${issue.number}`}
                          className="font-weight-bold"
                        >
                          #{issue.number} {issue.title}
                        </Link>
                      </td>
                      <td>
                        <span className={`badge badge-${issue.stateColor}`}>
                          {issue.state}
                        </span>
                      </td>
                      <td className="text-muted">{issue.votes}</td>
                      <td className="text-muted">{issue.comments}</td>
                      <td className="text-muted">{issue.submitter}</td>
                      <td className="text-muted">{issue.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-muted text-center py-4">
                  No issues match your query.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
}
