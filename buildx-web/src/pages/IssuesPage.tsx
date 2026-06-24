import { useState } from "react";
import { Link } from "react-router-dom";
import { fetchIssues, type Issue } from "../api/issues";
import { EmptyListState } from "../components/global-list/EmptyListState";
import { DEFAULT_QUERY_LINKS, ResourceListPanel } from "../components/global-list/ResourceListPanel";
import { SideMainPage } from "../components/global-list/SideMainPage";
import { buildProjectScopedHref } from "../data/queryPresets";
import { useAsyncResource } from "../hooks/useAsyncResource";

function IssueRow({ issue }: { issue: Issue }) {
  return (
    <div className="issue-item border-bottom py-4">
      <div className="primary d-flex mb-3">
        <div className="mr-4 flex-grow-1 d-flex flex-wrap row-gap-2">
          <span className="mr-2">
            <Link to={`/${issue.project?.path ?? issue.projectId}/~issues/${issue.number}`}>
              #{issue.number} {issue.title}
            </Link>
          </span>
          <span className="badge badge-light-primary mr-2">{issue.state}</span>
        </div>
        <div className="flex-shrink-0 d-none d-lg-block text-muted">
          <span className="votes mr-2" title="Votes">
            <img src="/~icon/thumb-up.svg" alt="" className="icon mr-1" width={14} height={14} />
            {issue.voteCount}
          </span>
          <span className="comments" title="Comments">
            <img src="/~icon/comments.svg" alt="" className="icon mr-1" width={14} height={14} />
            {issue.commentCount}
          </span>
        </div>
      </div>
      <div className="secondary d-flex flex-wrap text-muted font-size-sm">
        <span className="mr-3">
          <img src="/~icon/project.svg" alt="" className="icon mr-1" width={14} height={14} />
          <Link to={`/${issue.project?.path ?? ""}`}>{issue.project?.path ?? "—"}</Link>
        </span>
        <span>{issue.submitter?.name ?? "unknown"}</span>
      </div>
    </div>
  );
}

export function IssuesPage() {
  const [query, setQuery] = useState("");
  const { data: issues, loading, error } = useAsyncResource(fetchIssues, []);

  return (
    <SideMainPage
      title="Issues"
      padding="outer"
      savedQueries={{
        storageKey: "issues:global",
        currentQuery: query,
        onSelectQuery: setQuery,
        buildHref: (q) => buildProjectScopedHref("/~issues", q),
      }}
    >
      {(savedQueries) => (
        <ResourceListPanel
          cardClass="issue-list"
          queryPlaceholder="Query/order issues"
          actionTitle="Create new issue"
          toolbarLinks={[
            ...DEFAULT_QUERY_LINKS,
            { icon: "select", label: "Fields & Links" },
            { icon: "import", label: "Import" },
            { icon: "clock", label: "Timing" },
          ]}
          savedQueryToolbar={savedQueries.toolbarActions}
          query={query}
          onQuery={setQuery}
          count={issues?.length}
          loading={loading}
          error={error}
        >
          {!issues?.length ? (
            <EmptyListState message="No issues yet" />
          ) : (
            <div>{issues.map((issue) => <IssueRow key={issue.id} issue={issue} />)}</div>
          )}
        </ResourceListPanel>
      )}
    </SideMainPage>
  );
}
