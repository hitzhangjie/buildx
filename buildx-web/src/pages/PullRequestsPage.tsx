import { useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchPullRequests,
  pullRequestStatusBadge,
  pullRequestStatusLabel,
  type PullRequest,
} from "../api/pullRequests";
import { EmptyListState } from "../components/global-list/EmptyListState";
import { DEFAULT_QUERY_LINKS, ResourceListPanel } from "../components/global-list/ResourceListPanel";
import { SideMainPage } from "../components/global-list/SideMainPage";
import { buildProjectScopedHref } from "../data/queryPresets";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { formatWhenISO } from "../util/time";

function PullRequestRow({ pr }: { pr: PullRequest }) {
  const projectPath = pr.targetProject?.path ?? pr.projectPath ?? "";
  return (
    <div className="pull-request-item border-bottom py-4">
      <div className="primary d-flex mb-3">
        <div className="mr-4 flex-grow-1 d-flex flex-wrap row-gap-2">
          <span className="mr-2">
            <Link to={`/${projectPath}/~pulls/${pr.number}`}>{pr.title}</Link>
            <span className="number ml-1 text-muted">#{pr.number}</span>
          </span>
          <span className={`badge ${pullRequestStatusBadge(pr.status)}`}>
            {pullRequestStatusLabel(pr.status)}
          </span>
        </div>
      </div>
      <div className="secondary text-muted font-size-sm">
        <img src="/~icon/project.svg" alt="" className="icon mr-1" width={14} height={14} />
        <Link to={`/${projectPath}`}>{projectPath}</Link>
        <span className="mx-2">·</span>
        {pr.sourceBranch} → {pr.targetBranch}
        <span className="mx-2">·</span>
        {pr.submitter?.name ?? "Unknown"}
        <span className="mx-2">·</span>
        {formatWhenISO(pr.submitDate)}
      </div>
    </div>
  );
}

export function PullRequestsPage() {
  const [query, setQuery] = useState("");
  const { data: pulls, loading, error } = useAsyncResource(fetchPullRequests, []);

  return (
    <SideMainPage
      title="Pull Requests"
      savedQueries={{
        storageKey: "pulls:global",
        currentQuery: query,
        onSelectQuery: setQuery,
        buildHref: (q) => buildProjectScopedHref("/~pulls", q),
      }}
    >
      {(savedQueries) => (
        <ResourceListPanel
          cardClass="pull-request-list"
          queryPlaceholder="Query/order pull requests"
          actionTitle="Open new pull request"
          toolbarLinks={DEFAULT_QUERY_LINKS}
          savedQueryToolbar={savedQueries.toolbarActions}
          query={query}
          onQuery={setQuery}
          count={pulls?.length}
          loading={loading}
          error={error}
        >
          {!pulls?.length ? (
            <EmptyListState message="No pull requests yet" />
          ) : (
            <div>{pulls.map((pr) => <PullRequestRow key={pr.id} pr={pr} />)}</div>
          )}
        </ResourceListPanel>
      )}
    </SideMainPage>
  );
}
