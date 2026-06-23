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

export const mockIssues: Issue[] = [
  {
    id: 1,
    number: 1,
    title: "Setup CI pipeline",
    projectPath: "demo",
    state: "Open",
    submitter: "admin",
    votes: 2,
    comments: 3,
  },
  {
    id: 2,
    number: 2,
    title: "Fix login redirect",
    projectPath: "platform",
    state: "In Progress",
    submitter: "admin",
    votes: 0,
    comments: 1,
  },
];
