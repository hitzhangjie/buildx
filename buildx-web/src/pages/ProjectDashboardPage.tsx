import { Navigate } from "react-router-dom";
import { useProjectContext } from "../context/ProjectContext";

/** OneDev ProjectDashboardPage redirects to the primary project view. */
export function ProjectDashboardPage() {
  const { projectPath } = useProjectContext();

  if (!projectPath) {
    return <Navigate to="/~projects" replace />;
  }

  return <Navigate to={`/${projectPath}/~files`} replace />;
}
