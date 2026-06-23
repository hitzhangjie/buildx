export type Build = {
  id: number;
  number: number;
  job: string;
  projectPath: string;
  branch: string;
  status: "SUCCESSFUL" | "FAILED" | "RUNNING" | "CANCELLED" | "WAITING";
  submitter: string;
};

export const mockBuilds: Build[] = [
  {
    id: 1,
    number: 42,
    job: "CI",
    projectPath: "demo",
    branch: "main",
    status: "SUCCESSFUL",
    submitter: "admin",
  },
  {
    id: 2,
    number: 43,
    job: "CI",
    projectPath: "demo",
    branch: "feature/metrics",
    status: "RUNNING",
    submitter: "admin",
  },
];
