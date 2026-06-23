export type MockRow = {
  id: string;
  primary: string;
  secondary?: string;
  meta?: string;
  href?: string;
};

export function mockRowsForPage(page: string, _projectPath?: string, _params?: Record<string, string>): MockRow[] {
  if (page.includes("Commit")) {
    return [];
  }
  if (page.includes("Branch")) {
    return [];
  }
  if (page.includes("Tag")) {
    return [];
  }
  if (page.includes("Issue") || page.includes("Iteration")) {
    return [];
  }
  if (page.includes("Pull")) {
    return [];
  }
  if (page.includes("Build")) {
    return [];
  }
  if (page.includes("Pack") || page.includes("Package")) {
    return [];
  }
  if (page.includes("Workspace")) {
    return [];
  }
  if (page.includes("CodeComment")) {
    return [];
  }
  if (page.includes("Children")) {
    return [];
  }
  if (page.includes("UserList")) {
    return [{ id: "admin", primary: "admin", secondary: "Administrator", meta: "admin@localhost" }];
  }
  if (page.includes("RoleList")) {
    return [{ id: "owner", primary: "Project Owner", secondary: "Built-in", meta: "" }];
  }
  if (page.includes("GroupList")) {
    return [{ id: "developers", primary: "developers", secondary: "Default group", meta: "2 members" }];
  }
  if (page.includes("Invitation")) {
    return [{ id: "1", primary: "dev@example.com", secondary: "Pending", meta: "Sent 1 day ago" }];
  }
  if (page.includes("Agent")) {
    return [{ id: "agent-1", primary: "agent-1", secondary: "Online", meta: "linux/amd64", href: `/~administration/agents/agent-1` }];
  }
  return [{ id: "1", primary: page.replace(/Page$/, ""), secondary: "Sample entry", meta: "stub data" }];
}

export function detailTabsForPage(page: string, projectPath: string, params: Record<string, string>): { label: string; href: string; active: boolean }[] {
  const base = `/${projectPath}`;
  if (page.includes("Build") && params.build) {
    const b = params.build;
    const tabs = [
      { suffix: "", label: "Dashboard" },
      { suffix: "/pipeline", label: "Pipeline" },
      { suffix: "/log", label: "Log" },
      { suffix: "/changes", label: "Changes" },
      { suffix: "/fixed-issues", label: "Fixed Issues" },
      { suffix: "/artifacts", label: "Artifacts" },
    ];
    return tabs.map((t) => ({
      label: t.label,
      href: `${base}/~builds/${b}${t.suffix}`,
      active: page.toLowerCase().includes(t.label.toLowerCase().replace(" ", "")) || (t.label === "Dashboard" && page === "BuildDashboardPage"),
    }));
  }
  if (page.includes("Pull") && params.request) {
    const r = params.request;
    return [
      { label: "Activities", href: `${base}/~pulls/${r}`, active: page.includes("Activities") },
      { label: "Changes", href: `${base}/~pulls/${r}/changes`, active: page.includes("Changes") },
      { label: "Code Comments", href: `${base}/~pulls/${r}/code-comments`, active: page.includes("CodeComments") },
    ];
  }
  if (page.includes("Issue") && params.issue) {
    const i = params.issue;
    return [
      { label: "Issue", href: `${base}/~issues/${i}`, active: page === "IssueDetailPage" },
      { label: "Commits", href: `${base}/~issues/${i}/commits`, active: page.includes("IssueCommits") },
      { label: "Pull Requests", href: `${base}/~issues/${i}/pulls`, active: page.includes("IssuePullRequests") },
      { label: "Builds", href: `${base}/~issues/${i}/builds`, active: page.includes("IssueBuilds") },
    ];
  }
  if (page.includes("Workspace") && params.workspace) {
    const w = params.workspace;
    return [
      { label: "Dashboard", href: `${base}/~workspaces/${w}`, active: page.includes("WorkspaceDashboard") },
      { label: "Changes", href: `${base}/~workspaces/${w}/changes`, active: page.includes("WorkspaceChanges") },
      { label: "Log", href: `${base}/~workspaces/${w}/log`, active: page.includes("WorkspaceLog") },
    ];
  }
  return [{ label: "Overview", href: "#", active: true }];
}

export function settingNavForProject(
  projectPath: string,
  activePage: string,
): { label: string; href: string; active: boolean }[] {
  const base = `/${projectPath}/~settings`;
  const items = [
    { label: "General", href: `${base}/general`, page: "GeneralProjectSettingPage" },
    { label: "User Authorizations", href: `${base}/user-authorizations`, page: "UserAuthorizationsPage" },
    { label: "Branch Protection", href: `${base}/branch-protection`, page: "BranchProtectionsPage" },
    { label: "Pull Request", href: `${base}/pull-request`, page: "PullRequestSettingPage" },
    { label: "Job Secrets", href: `${base}/build/job-secrets`, page: "JobSecretsPage" },
    { label: "Web Hooks", href: `${base}/web-hooks`, page: "WebHooksPage" },
    { label: "AI", href: `${base}/ai`, page: "ProjectAiSettingPage" },
  ];
  return items.map((item) => ({
    label: item.label,
    href: item.href,
    active: item.page === activePage,
  }));
}
