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

export const mockPullRequests: PullRequest[] = [];
