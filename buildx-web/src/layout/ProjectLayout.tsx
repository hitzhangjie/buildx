import { type ReactNode, useEffect, useState } from "react";
import { fetchProjects } from "../api/projects";
import { getProjectSidebarMenu } from "./projectSidebar";
import { Layout } from "./Layout";
import { ProjectTopbarTitle } from "./ProjectTopbarTitle";
import { SidebarMenuItems, sidebarMenuFromProjectItems } from "./SidebarMenuItems";

type ProjectLayoutProps = {
  projectPath: string;
  pageTitle: string;
  children: ReactNode;
};

function useProjectSidebarHeader(projectPath: string) {
  const fallbackName = projectPath.split("/").filter(Boolean).pop() ?? projectPath;
  const [header, setHeader] = useState({ label: fallbackName, avatarUrl: undefined as string | undefined });

  useEffect(() => {
    let cancelled = false;
    fetchProjects()
      .then((projects) => {
        if (cancelled) {
          return;
        }
        const project = projects.find((item) => item.path === projectPath);
        if (!project) {
          return;
        }
        setHeader({
          label: project.name,
          avatarUrl: `/avatars/projects/${project.id}.png`,
        });
      })
      .catch(() => {
        // Keep path-derived fallback when projects API is unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  return header;
}

export function ProjectLayout({ projectPath, pageTitle, children }: ProjectLayoutProps) {
  const menu = sidebarMenuFromProjectItems(getProjectSidebarMenu(projectPath), projectPath);
  const header = useProjectSidebarHeader(projectPath);

  return (
    <Layout
      topbarTitle={<ProjectTopbarTitle projectPath={projectPath} pageTitle={pageTitle} />}
      projectSidebar={{
        header,
        menu: <SidebarMenuItems items={menu} />,
      }}
    >
      <div className="project flex-grow-1 d-flex flex-column fit-content">{children}</div>
    </Layout>
  );
}
