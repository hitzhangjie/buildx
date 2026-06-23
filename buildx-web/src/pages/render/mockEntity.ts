export type MockRow = {
  id: string;
  primary: string;
  secondary?: string;
  meta?: string;
  href?: string;
};

export function mockRowsForPage(page: string, projectPath?: string, params?: Record<string, string>): MockRow[] {
  const base = projectPath ? `/${projectPath}` : "";
  const p = params ?? {};

  if (page.includes("Commit")) {
    return [
      { id: "1", primary: "Initial commit", secondary: "admin", meta: "2 days ago", href: `${base}/~commits/abc1234` },
      { id: "2", primary: "Add CI pipeline", secondary: "admin", meta: "1 day ago", href: `${base}/~commits/def5678` },
    ];
  }
  if (page.includes("Branch")) {
    return [
      { id: "main", primary: "main", secondary: "default", meta: "abc1234" },
      { id: "dev", primary: "develop", secondary: "", meta: "def5678" },
    ];
  }
  if (page.includes("Tag")) {
    return [{ id: "v1", primary: "v1.0.0", secondary: "Release", meta: "abc1234" }];
  }
  if (page.includes("Issue") || page.includes("Iteration")) {
    const issue = p.issue ?? "1";
    return [
      { id: "1", primary: "#1 Setup project", secondary: "Open", meta: "admin", href: `${base}/~issues/1` },
      { id: "2", primary: "#2 Fix build", secondary: "In Progress", meta: "admin", href: `${base}/~issues/2` },
    ].filter((r) => !page.includes("Detail") || r.id === issue);
  }
  if (page.includes("Pull")) {
    return [{ id: "1", primary: "Add metrics dashboard", secondary: "Open", meta: "feature/metrics → main", href: `${base}/~pulls/1` }];
  }
  if (page.includes("Build")) {
    const build = p.build ?? "42";
    return [{ id: build, primary: `#${build} CI`, secondary: "SUCCESSFUL", meta: "main", href: `${base}/~builds/${build}` }];
  }
  if (page.includes("Pack") || page.includes("Package")) {
    return [{ id: "demo-app", primary: "demo-app", secondary: "1.0.0", meta: "docker", href: `${base}/~packages/demo-app` }];
  }
  if (page.includes("Workspace")) {
    const ws = p.workspace ?? "1";
    return [{ id: ws, primary: "dev-env", secondary: "Running", meta: "main", href: `${base}/~workspaces/${ws}` }];
  }
  if (page.includes("CodeComment")) {
    return [{ id: "1", primary: "Comment on main.go:12", secondary: "admin", meta: "2 days ago" }];
  }
  if (page.includes("Children")) {
    return [{ id: "child", primary: "child-project", secondary: "CHILD", meta: "Sub project" }];
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
