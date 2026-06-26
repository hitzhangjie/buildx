import { Navigate } from "react-router-dom";
import { useProject } from "../../../context/ProjectContext";

/** OneDev BuildDashboardPage redirects to the first available detail tab (log). */
export function BuildDashboardPage() {
  const { projectPath, params } = useProject();
  const build = params.build;

  if (!build) {
    return null;
  }

  return <Navigate to={`/${projectPath}/~builds/${build}/log`} replace />;
}
