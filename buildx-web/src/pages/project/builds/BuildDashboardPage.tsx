import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProject } from "../../../context/ProjectContext";

/** OneDev BuildDashboardPage redirects to the first available detail tab (log). */
export function BuildDashboardPage() {
  const { projectPath } = useProject();
  const { build } = useParams<{ build: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (build) {
      navigate(`/${projectPath}/~builds/${build}/log`, { replace: true });
    }
  }, [projectPath, build, navigate]);

  return null;
}
