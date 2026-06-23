export type LayoutKind = "main" | "simple";

export type KnownPage =
  | "projects"
  | "login"
  | "logout"
  | "signup"
  | "serverInit"
  | "newProject"
  | "issues"
  | "pulls"
  | "builds"
  | "packages"
  | "workspaces"
  | "notFound";

export type KnownProjectPage = "dashboard" | "blob";

export type RouteDefinition = {
  path: string;
  page: string;
  title: string;
  ref: string;
  layout: LayoutKind;
  known?: KnownPage;
};

export type ProjectRouteDefinition = {
  suffix: string;
  page: string;
  title: string;
  ref: string;
  known?: KnownProjectPage;
};

export type MatchedProjectRoute = {
  projectPath: string;
  def: ProjectRouteDefinition;
  params: Record<string, string>;
  blobSegments?: string[];
};
