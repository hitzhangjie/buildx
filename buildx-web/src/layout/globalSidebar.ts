import type { SidebarMenuItemDef } from "./SidebarMenuItems";
import { getAdministrationSidebarMenu } from "./administrationSidebar";

type GlobalSidebarOptions = {
  isAdministrator?: boolean;
};

export function getGlobalSidebarMenu(options: GlobalSidebarOptions = {}): SidebarMenuItemDef[] {
  const items: SidebarMenuItemDef[] = [
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

  if (options.isAdministrator) {
    items.push(getAdministrationSidebarMenu());
  }

  return items;
}
