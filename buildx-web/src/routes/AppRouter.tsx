import { Navigate, Route, Routes, matchPath, useLocation } from "react-router-dom";
import { ProjectProvider } from "../context/ProjectContext";
import { GLOBAL_ROUTES } from "./globalRoutes";
import { matchProjectRoute } from "./matchProjectRoute";
import { BuildsPage } from "../pages/BuildsPage";
import { IssuesPage } from "../pages/IssuesPage";
import { LoginPage } from "../pages/LoginPage";
import { LogoutPage } from "../pages/LogoutPage";
import { NewProjectPage } from "../pages/NewProjectPage";
import { PackagesPage } from "../pages/PackagesPage";
import { PageNotFoundPage } from "../pages/PageNotFoundPage";
import { ProjectBlobPage } from "../pages/ProjectBlobPage";
import { ProjectDashboardPage } from "../pages/ProjectDashboardPage";
import { PageRenderer } from "../pages/render/PageRenderer";
import { ProjectsPage } from "../pages/ProjectsPage";
import { PullRequestsPage } from "../pages/PullRequestsPage";
import { ServerInitPage } from "../pages/ServerInitPage";
import { SignUpPage } from "../pages/SignUpPage";
import { WorkspacesPage } from "../pages/WorkspacesPage";
import type { RouteDefinition } from "./types";

const GLOBAL_KNOWN: Partial<Record<NonNullable<RouteDefinition["known"]>, () => React.ReactNode>> = {
  projects: () => <ProjectsPage />,
  login: () => <LoginPage />,
  logout: () => <LogoutPage />,
  signup: () => <SignUpPage />,
  serverInit: () => <ServerInitPage />,
  newProject: () => <NewProjectPage />,
  issues: () => <IssuesPage />,
  pulls: () => <PullRequestsPage />,
  builds: () => <BuildsPage />,
  packages: () => <PackagesPage />,
  workspaces: () => <WorkspacesPage />,
  notFound: () => <PageNotFoundPage />,
};

function GlobalRouteElement({ def }: { def: RouteDefinition }) {
  const { pathname } = useLocation();
  const matched = matchPath(def.path, pathname);
  const params = (matched?.params ?? {}) as Record<string, string>;

  if (def.known && GLOBAL_KNOWN[def.known]) {
    return GLOBAL_KNOWN[def.known]!();
  }
  return (
    <PageRenderer
      title={def.title}
      page={def.page}
      refPath={def.ref}
      layout={def.layout}
      params={params}
    />
  );
}

function ProjectRouteElement() {
  const { pathname } = useLocation();
  const matched = matchProjectRoute(pathname);

  if (!matched) {
    return <PageNotFoundPage />;
  }

  if (matched.def.known === "dashboard") {
    return <ProjectDashboardPage />;
  }

  if (matched.def.known === "blob") {
    return <ProjectBlobPage />;
  }

  return (
    <PageRenderer
      title={matched.def.title}
      page={matched.def.page}
      refPath={matched.def.ref}
      layout="main"
      projectPath={matched.projectPath}
      params={matched.params}
    />
  );
}

function LegacyProjectRedirect() {
  const { pathname } = useLocation();
  const rest = pathname.replace(/^\/projects\//, "");
  return <Navigate to={`/${rest}`} replace />;
}

export function AppRouter() {
  return (
    <ProjectProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/~projects" replace />} />
        {GLOBAL_ROUTES.map((def) => (
          <Route key={def.path} path={def.path} element={<GlobalRouteElement def={def} />} />
        ))}
        <Route path="/projects/*" element={<LegacyProjectRedirect />} />
        <Route path="/*" element={<ProjectRouteElement />} />
      </Routes>
    </ProjectProvider>
  );
}
