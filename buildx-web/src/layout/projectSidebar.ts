export type ProjectMenuItem = {
  label: string;
  href?: string;
  icon?: string;
  activeSuffix?: string;
  children?: ProjectMenuItem[];
};

export function getProjectSidebarMenu(projectPath: string): ProjectMenuItem[] {
  const link = (suffix: string) => `/${projectPath}${suffix}`;

  return [
    {
      label: "Code",
      icon: "git",
      children: [
        { label: "Files", href: link("/~files"), activeSuffix: "/~files" },
        { label: "Commits", href: link("/~commits"), activeSuffix: "/~commits" },
        { label: "Branches", href: link("/~branches"), activeSuffix: "/~branches" },
        { label: "Tags", href: link("/~tags"), activeSuffix: "/~tags" },
        { label: "Code Comments", href: link("/~code-comments"), activeSuffix: "/~code-comments" },
        { label: "Code Compare", href: link("/~compare"), activeSuffix: "/~compare" },
      ],
    },
    {
      label: "Pull Requests",
      icon: "pull-request",
      href: link("/~pulls"),
      activeSuffix: "/~pulls",
    },
    {
      label: "Issues",
      icon: "bug",
      children: [
        { label: "List", href: link("/~issues"), activeSuffix: "/~issues" },
        { label: "Boards", href: link("/~boards"), activeSuffix: "/~boards" },
        { label: "Iterations", href: link("/~iterations"), activeSuffix: "/~iterations" },
      ],
    },
    {
      label: "Builds",
      icon: "play-circle",
      href: link("/~builds"),
      activeSuffix: "/~builds",
    },
    {
      label: "Packages",
      icon: "package",
      href: link("/~packages"),
      activeSuffix: "/~packages",
    },
    {
      label: "Workspaces",
      icon: "workspace",
      href: link("/~workspaces"),
      activeSuffix: "/~workspaces",
    },
    {
      label: "Statistics",
      icon: "stats",
      children: [
        {
          label: "Code",
          href: link("/~stats/code/contribs"),
          activeSuffix: "/~stats/code",
        },
        {
          label: "Build Metrics",
          href: link("/~stats/buildmetric"),
          activeSuffix: "/~stats/buildmetric",
        },
      ],
    },
    {
      label: "Child Projects",
      icon: "tree",
      href: link("/~children"),
      activeSuffix: "/~children",
    },
    {
      label: "Settings",
      icon: "sliders",
      activeSuffix: "/~settings",
      children: [
        { label: "General", href: link("/~settings/general"), activeSuffix: "/~settings/general" },
        { label: "Edit Avatar", href: link("/~settings/avatar-edit"), activeSuffix: "/~settings/avatar-edit" },
        {
          label: "Authorization",
          children: [
            { label: "By User", href: link("/~settings/user-authorizations"), activeSuffix: "/~settings/user-authorizations" },
            { label: "By Group", href: link("/~settings/group-authorizations"), activeSuffix: "/~settings/group-authorizations" },
          ],
        },
        {
          label: "Code",
          children: [
            { label: "Branch Protection", href: link("/~settings/branch-protection"), activeSuffix: "/~settings/branch-protection" },
            { label: "Tag Protection", href: link("/~settings/tag-protection"), activeSuffix: "/~settings/tag-protection" },
            { label: "Code Analysis", href: link("/~settings/code-analysis"), activeSuffix: "/~settings/code-analysis" },
            { label: "Git Pack Config", href: link("/~settings/git-pack-config"), activeSuffix: "/~settings/git-pack-config" },
          ],
        },
        { label: "Pull Request", href: link("/~settings/pull-request"), activeSuffix: "/~settings/pull-request" },
        {
          label: "Issue",
          children: [
            { label: "Branch Prefix", href: link("/~settings/issue/branch-prefix"), activeSuffix: "/~settings/issue/branch-prefix" },
            { label: "State Transitions", href: link("/~settings/issue/state-transitions"), activeSuffix: "/~settings/issue/state-transitions" },
          ],
        },
        {
          label: "Build",
          children: [
            { label: "Job Secrets", href: link("/~settings/build/job-secrets"), activeSuffix: "/~settings/build/job-secrets" },
            { label: "Job Properties", href: link("/~settings/build/job-properties"), activeSuffix: "/~settings/build/job-properties" },
            { label: "Build Preserve Rules", href: link("/~settings/build/build-preserve-rules"), activeSuffix: "/~settings/build/build-preserve-rules" },
            { label: "Default Fixed Issue Filters", href: link("/~settings/build/default-fixed-issues-filter"), activeSuffix: "/~settings/build/default-fixed-issues-filter" },
          ],
        },
        { label: "Workspace Specs", href: link("/~settings/workspace-spec"), activeSuffix: "/~settings/workspace-spec" },
        { label: "Cache Management", href: link("/~settings/build/cache-management"), activeSuffix: "/~settings/build/cache-management" },
        { label: "Service Desk", href: link("/~settings/service-desk"), activeSuffix: "/~settings/service-desk" },
        {
          label: "Notification",
          children: [
            { label: "Web Hooks", href: link("/~settings/web-hooks"), activeSuffix: "/~settings/web-hooks" },
          ],
        },
        { label: "AI", href: link("/~settings/ai"), activeSuffix: "/~settings/ai" },
      ],
    },
  ];
}

export function isProjectMenuActive(
  pathname: string,
  projectPath: string,
  item: ProjectMenuItem,
): boolean {
  const prefix = `/${projectPath}`;
  if (!pathname.startsWith(prefix)) {
    return false;
  }
  const suffix = pathname.slice(prefix.length).replace(/\/+$/, "") || "";

  if (item.children) {
    return item.children.some((child) => isProjectMenuActive(pathname, projectPath, child));
  }

  const active = item.activeSuffix ?? "";
  if (!active) {
    return pathname === item.href;
  }
  return suffix === active || suffix.startsWith(`${active}/`);
}
