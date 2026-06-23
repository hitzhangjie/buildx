import { Navigate, Route, Routes, matchPath, useLocation } from "react-router-dom";
import { ProjectProvider } from "../context/ProjectContext";
import { GLOBAL_ROUTES } from "./globalRoutes";
import { matchProjectRoute } from "./matchProjectRoute";
import { RequireLayoutAccess } from "./RequireLayoutAccess";
import { BuildsPage } from "../pages/BuildsPage";
import { IssuesPage } from "../pages/IssuesPage";
import { LoginPage } from "../pages/security/LoginPage";
import { LogoutPage } from "../pages/LogoutPage";
import { NewProjectPage } from "../pages/project/NewProjectPage";
import { PackagesPage } from "../pages/PackagesPage";
import { PageNotFoundPage } from "../pages/PageNotFoundPage";
import { ProjectBlobPage } from "../pages/ProjectBlobPage";
import { ProjectDashboardPage } from "../pages/ProjectDashboardPage";
import { PageRenderer } from "../pages/render/PageRenderer";
import { ProjectsPage } from "../pages/project/ProjectListPage";
import { PullRequestsPage } from "../pages/PullRequestsPage";
import { ServerInitPage } from "../pages/ServerInitPage";
import { SignUpPage } from "../pages/security/SignUpPage";
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

  let content: React.ReactNode;
  if (def.known && GLOBAL_KNOWN[def.known]) {
    content = GLOBAL_KNOWN[def.known]!();
  } else {
    content = (
      <PageRenderer
        title={def.title}
        page={def.page}
        refPath={def.ref}
        layout={def.layout}
        params={params}
      />
    );
  }

  if (def.layout === "simple") {
    return content;
  }
  return <RequireLayoutAccess>{content}</RequireLayoutAccess>;
}

function ProjectRouteElement() {
  const { pathname } = useLocation();
  const matched = matchProjectRoute(pathname);

  if (!matched) {
    return <PageNotFoundPage />;
  }

  let content: React.ReactNode;
  if (matched.def.known === "dashboard") {
    content = <ProjectDashboardPage />;
  } else if (matched.def.known === "blob") {
    content = <ProjectBlobPage />;
  } else {
    content = (
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

  return <RequireLayoutAccess>{content}</RequireLayoutAccess>;
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
