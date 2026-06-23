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
      icon: "gear",
      href: link("/~settings/general"),
      activeSuffix: "/~settings",
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
