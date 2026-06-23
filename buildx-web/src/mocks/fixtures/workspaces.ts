export type Workspace = {
  id: number;
  name: string;
  projectPath: string;
  branch: string;
  status: string;
  owner: string;
};

export const mockWorkspaces: Workspace[] = [];
