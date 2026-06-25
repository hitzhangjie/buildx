export interface Workspace {
  id: number;
  number: number;
  userId: number;
  user?: {
    id: number;
    name: string;
    fullName: string;
    type: string;
    disabled: boolean;
  };
  projectId: number;
  project?: {
    id: number;
    name: string;
    path: string;
    pathLen: number;
    key: string;
    description: string;
    createDate: string;
  };
  specName: string;
  branch: string | null;
  commitHash: string;
  status: "PENDING" | "ACTIVE" | "INACTIVE";
  createDate: string;
  activeDate: string | null;
  inactiveDate: string | null;
  provisionerName: string | null;
  serverAddress: string | null;
  agentId: number | null;
}

export type WorkspaceStatus = Workspace["status"];

export const mockWorkspaces: Workspace[] = [];
