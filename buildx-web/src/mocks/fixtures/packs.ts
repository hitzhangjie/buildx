export type Pack = {
  id: number;
  name: string;
  projectPath: string;
  version: string;
  type: string;
};

export const mockPacks: Pack[] = [
  {
    id: 1,
    name: "demo-app",
    projectPath: "demo",
    version: "1.0.0",
    type: "docker",
  },
];
