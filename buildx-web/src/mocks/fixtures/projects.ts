import type { Project } from "../../api/projects";

export const mockProjects: Project[] = [
  {
    id: 1,
    name: "Demo",
    path: "demo",
    key: "DEMO",
    description: "Sample project",
    stats: { fileCount: 42, commitCount: 156, branchCount: 5, tagCount: 3, workspaceCount: 0 },
  },
  {
    id: 2,
    name: "Platform",
    path: "platform",
    key: "PLAT",
    description: "Platform services",
    stats: { fileCount: 128, commitCount: 420, branchCount: 8, tagCount: 7, workspaceCount: 2 },
  },
];
