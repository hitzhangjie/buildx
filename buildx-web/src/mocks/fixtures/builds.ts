export type Build = {
  id: number;
  number: number;
  job: string;
  projectPath: string;
  branch: string;
  status: "SUCCESSFUL" | "FAILED" | "RUNNING" | "CANCELLED" | "WAITING";
  submitter: string;
};

export const mockBuilds: Build[] = [];
