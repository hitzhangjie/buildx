import { type ReactNode } from "react";
import { ProjectLayout } from "../../layout/ProjectLayout";
import "../../pages/project/settings/project-setting.css";

type SettingsLayoutProps = {
  projectPath: string;
  pageTitle: string;
  children: ReactNode;
};

/**
 * Shared layout for project settings pages.
 * Mirrors OneDev ProjectSettingPage.html: wraps children in
 * <div class="project-setting p-2 p-sm-5"> inside ProjectLayout.
 * Settings navigation is in the main sidebar, NOT in-page.
 */
export function SettingsLayout({
  projectPath,
  pageTitle,
  children,
}: SettingsLayoutProps) {
  return (
    <ProjectLayout projectPath={projectPath} pageTitle={pageTitle}>
      <div className="project-setting p-2 p-sm-5">
        {children}
      </div>
    </ProjectLayout>
  );
}
