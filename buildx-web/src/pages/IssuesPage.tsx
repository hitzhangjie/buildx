import { Link } from "react-router-dom";
import { fetchIssues, type Issue } from "../api/issues";
import { EmptyListState } from "../components/global-list/EmptyListState";
import { DEFAULT_QUERY_LINKS, ResourceListPanel } from "../components/global-list/ResourceListPanel";
import { SideMainPage } from "../components/global-list/SideMainPage";
import { useAsyncResource } from "../hooks/useAsyncResource";

function IssueRow({ issue }: { issue: Issue }) {
  return (
    <div className="issue-item border-bottom py-4">
      <div className="primary d-flex mb-3">
        <div className="mr-4 flex-grow-1 d-flex flex-wrap row-gap-2">
          <span className="mr-2">
            <Link to={`/${issue.projectPath}/~issues/${issue.number}`}>
              #{issue.number} {issue.title}
            </Link>
          </span>
          <span className="badge badge-light-primary mr-2">{issue.state}</span>
        </div>
        <div className="flex-shrink-0 d-none d-lg-block text-muted">
          <span className="votes mr-2" title="Votes">
            <img src="/~icon/thumb-up.svg" alt="" className="icon mr-1" width={14} height={14} />
            {issue.votes}
          </span>
          <span className="comments" title="Comments">
            <img src="/~icon/comments.svg" alt="" className="icon mr-1" width={14} height={14} />
            {issue.comments}
          </span>
        </div>
      </div>
      <div className="secondary d-flex flex-wrap text-muted font-size-sm">
        <span className="mr-3">
          <img src="/~icon/project.svg" alt="" className="icon mr-1" width={14} height={14} />
          <Link to={`/${issue.projectPath}`}>{issue.projectPath}</Link>
        </span>
        <span>{issue.submitter}</span>
      </div>
    </div>
  );
}

export function IssuesPage() {
  const { data: issues, loading, error } = useAsyncResource(fetchIssues, []);

  return (
    <SideMainPage title="Issues" padding="outer">
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
    </SideMainPage>
  );
}
