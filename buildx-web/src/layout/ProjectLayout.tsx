import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { getProjectSidebarMenu, isProjectMenuActive, type ProjectMenuItem } from "./projectSidebar";
import { Layout } from "./Layout";
import { ProjectTopbarTitle } from "./ProjectTopbarTitle";

type ProjectLayoutProps = {
  projectPath: string;
  pageTitle: string;
  children: ReactNode;
};

function ProjectMenuLink({
  item,
  projectPath,
  depth = 0,
}: {
  item: ProjectMenuItem;
  projectPath: string;
  depth?: number;
}) {
  const { pathname } = useLocation();
  const active = isProjectMenuActive(pathname, projectPath, item);

  if (item.children?.length) {
    return (
      <div className={`menu-item${active ? " active" : ""}`}>
        <div className="menu-link" style={{ paddingLeft: depth ? `${depth * 0.75}rem` : undefined }}>
          {item.icon && (
            <img src={`/~icon/${item.icon}.svg`} alt="" className="icon mr-3" width={16} height={16} />
          )}
          <span className="menu-text">{item.label}</span>
        </div>
        <div className="menu-submenu">
          {item.children.map((child) => (
            <ProjectMenuLink key={child.label} item={child} projectPath={projectPath} depth={depth + 1} />
          ))}
        </div>
      </div>
    );
  }

  if (!item.href) {
    return null;
  }

  return (
    <Link
      className={`menu-item menu-link${active ? " active" : ""}`}
      to={item.href}
      style={{ paddingLeft: depth ? `${1 + depth * 0.75}rem` : undefined }}
    >
      {item.icon && depth === 0 && (
        <img src={`/~icon/${item.icon}.svg`} alt="" className="icon mr-3" width={16} height={16} />
      )}
      <span className="menu-text">{item.label}</span>
    </Link>
  );
}

export function ProjectLayout({ projectPath, pageTitle, children }: ProjectLayoutProps) {
  const menu = getProjectSidebarMenu(projectPath);

  return (
    <Layout
      mode="project"
      topbarTitle={<ProjectTopbarTitle projectPath={projectPath} pageTitle={pageTitle} />}
      projectSidebar={
        <>
          {menu.map((item) => (
            <ProjectMenuLink key={item.label} item={item} projectPath={projectPath} />
          ))}
        </>
      }
    >
      <div className="project flex-grow-1 d-flex flex-column fit-content">{children}</div>
    </Layout>
  );
}
