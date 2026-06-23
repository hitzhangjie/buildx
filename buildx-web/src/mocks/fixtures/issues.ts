export type Issue = {
  id: number;
  number: number;
  title: string;
  projectPath: string;
  state: string;
  submitter: string;
  votes: number;
  comments: number;
};

export const mockIssues: Issue[] = [];
