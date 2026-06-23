export type PullRequest = {
  id: number;
  number: number;
  title: string;
  projectPath: string;
  sourceBranch: string;
  targetBranch: string;
  status: string;
  submitter: string;
};

export const mockPullRequests: PullRequest[] = [
  {
    id: 1,
    number: 1,
    title: "Add build metrics dashboard",
    projectPath: "demo",
    sourceBranch: "feature/metrics",
    targetBranch: "main",
    status: "Open",
    submitter: "admin",
  },
];
