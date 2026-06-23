export type Workspace = {
  id: number;
  name: string;
  projectPath: string;
  branch: string;
  status: string;
  owner: string;
};

export const mockWorkspaces: Workspace[] = [
  {
    id: 1,
    name: "dev-env",
    projectPath: "demo",
    branch: "main",
    status: "Running",
    owner: "admin",
  },
];
