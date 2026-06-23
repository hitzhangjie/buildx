import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ProjectLayout } from "../../layout/ProjectLayout";

export type SettingsNavItem = {
  label: string;
  href: string;
  active: boolean;
};

type SettingsLayoutProps = {
  projectPath: string;
  pageTitle: string;
  navItems: SettingsNavItem[];
  children: ReactNode;
};

/**
 * Shared layout for project settings pages.
 * Renders a sidebar navigation card + main content area inside ProjectLayout.
 */
export function SettingsLayout({
  projectPath,
  pageTitle,
  navItems,
  children,
}: SettingsLayoutProps) {
  return (
    <ProjectLayout projectPath={projectPath} pageTitle={pageTitle}>
      <div className="d-flex">
        <div className="side d-none d-xl-block p-3" style={{ minWidth: 220 }}>
          <div className="card card-custom">
            <div className="card-body p-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`d-block px-3 py-2 rounded${item.active ? " bg-light-primary" : ""}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-grow-1">{children}</div>
      </div>
    </ProjectLayout>
  );
}
