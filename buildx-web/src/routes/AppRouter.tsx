import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ProjectProvider } from "../context/ProjectContext";
import { GLOBAL_ROUTES } from "./globalRoutes";
import { matchProjectRoute } from "./matchProjectRoute";
import { LoginPage } from "../pages/LoginPage";
import { PageNotFoundPage } from "../pages/PageNotFoundPage";
import { PageShell } from "../pages/PageShell";
import { ProjectsPage } from "../pages/ProjectsPage";
import type { RouteDefinition } from "./types";

function renderKnownPage(def: RouteDefinition) {
  switch (def.known) {
    case "projects":
      return <ProjectsPage />;
    case "login":
      return <LoginPage />;
    case "notFound":
      return <PageNotFoundPage />;
    default:
      return (
        <PageShell
          title={def.title}
          page={def.page}
          refPath={def.ref}
          layout={def.layout}
        />
      );
  }
}

function GlobalRouteElement({ def }: { def: RouteDefinition }) {
  if (def.layout === "simple") {
    return renderKnownPage(def);
  }
  return renderKnownPage(def);
}

function ProjectRouteElement() {
  const { pathname } = useLocation();
  const matched = matchProjectRoute(pathname);

  if (!matched) {
    return <PageNotFoundPage />;
  }

  return (
    <PageShell
      title={matched.def.title}
      page={matched.def.page}
      refPath={matched.def.ref}
      projectPath={matched.projectPath}
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
          <Route
            key={def.path}
            path={def.path}
            element={<GlobalRouteElement def={def} />}
          />
        ))}
        <Route path="/projects/*" element={<LegacyProjectRedirect />} />
        <Route path="/*" element={<ProjectRouteElement />} />
      </Routes>
    </ProjectProvider>
  );
}
