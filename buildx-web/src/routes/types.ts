export type LayoutKind = "main" | "simple";

export type KnownPage =
  | "projects"
  | "login"
  | "notFound";

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
};

export type MatchedProjectRoute = {
  projectPath: string;
  def: ProjectRouteDefinition;
  params: Record<string, string>;
};
