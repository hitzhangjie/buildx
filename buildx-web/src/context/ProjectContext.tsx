import { createContext, useContext, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { matchProjectRoute } from "../routes/matchProjectRoute";

type ProjectContextValue = {
  projectPath: string | null;
  page: string | null;
  params: Record<string, string>;
  blobSegments: string[];
};

const ProjectContext = createContext<ProjectContextValue>({
  projectPath: null,
  page: null,
  params: {},
  blobSegments: [],
});

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const matched = matchProjectRoute(pathname);

  const value: ProjectContextValue = matched
    ? {
        projectPath: matched.projectPath,
        page: matched.def.page,
        params: matched.params,
        blobSegments: matched.blobSegments ?? [],
      }
    : { projectPath: null, page: null, params: {}, blobSegments: [] };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjectContext(): ProjectContextValue {
  return useContext(ProjectContext);
}
