import type { SidebarMenuItemDef } from "./SidebarMenuItems";

export function getGlobalSidebarMenu(): SidebarMenuItemDef[] {
  return [
    {
      label: "Projects",
      icon: "project",
      href: "/~projects",
    },
    {
      label: "Global Views",
      icon: "grid",
      children: [
        { label: "Pull Requests", href: "/~pulls" },
        { label: "Issues", href: "/~issues" },
        { label: "Builds", href: "/~builds" },
        { label: "Packages", href: "/~packages" },
        { label: "Workspaces", href: "/~workspaces" },
      ],
    },
  ];
}
