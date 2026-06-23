export type PageTemplate =
  | "simple-form"
  | "simple-status"
  | "global-list"
  | "global-form"
  | "project-list"
  | "project-form"
  | "project-detail"
  | "project-setting"
  | "admin-list"
  | "admin-form"
  | "admin-email-template"
  | "account-form"
  | "help-api"
  | "log-viewer"
  | "terminal"
  | "compare"
  | "board"
  | "stats"
  | "generic-card";

export type PageRenderContext = {
  title: string;
  page: string;
  refPath: string;
  layout: "main" | "simple";
  projectPath?: string;
  params: Record<string, string>;
};
