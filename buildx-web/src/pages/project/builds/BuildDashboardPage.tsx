import { Navigate, useParams } from "react-router-dom";
import { useProject } from "../../../context/ProjectContext";

/** OneDev BuildDashboardPage redirects to the first available detail tab (log). */
export function BuildDashboardPage() {
  const { projectPath } = useProject();
  const { build } = useParams<{ build: string }>();

  if (!build) {
    return null;
  }

  return <Navigate to={`/${projectPath}/~builds/${build}/log`} replace />;
}
