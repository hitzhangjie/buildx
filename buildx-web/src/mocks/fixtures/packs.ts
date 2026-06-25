export interface PackBlob {
  id: number;
  sha256Hash: string;
  sha512Hash?: string;
  md5Hash?: string;
  sha1Hash?: string;
  size: number;
  createDate?: string;
}

export interface PackLabel {
  id: number;
  name: string;
  color?: string;
}

export interface Pack {
  id: number;
  /** e.g. "Container Image", "NPM", "Maven", "PyPI", "Ruby Gems", "NuGet", "Helm" */
  type: string;
  name: string;
  version: string;
  prerelease: boolean;
  /** Human-readable reference string: "name:version" or "name@version" */
  reference: string;
  projectId: number;
  projectPath: string;
  /** User who published */
  user?: {
    id: number;
    name: string;
    displayName: string;
  };
  /** Build that produced this package */
  build?: {
    id: number;
    buildNumber?: number;
    version?: string;
  };
  publishDate: string;
  /** Total size in bytes */
  size: number;
  labels: PackLabel[];
  blobs: PackBlob[];
}

/** Pre-generated mock packs for development / e2e testing. */
export const mockPacks: Pack[] = [
  {
    id: 1,
    type: "Container Image",
    name: "hello-world",
    version: "latest",
    prerelease: false,
    reference: "hello-world:latest",
    projectId: 1,
    projectPath: "demo",
    user: { id: 1, name: "admin", displayName: "Administrator" },
    build: { id: 101, buildNumber: 42 },
    publishDate: new Date(Date.now() - 3600000).toISOString(),
    size: 2457600,
    labels: [{ id: 1, name: "production", color: "#28a745" }],
    blobs: [
      { id: 501, sha256Hash: "sha256:abc123def456", size: 1228800 },
      { id: 502, sha256Hash: "sha256:789abc012def", size: 1228800 },
    ],
  },
  {
    id: 2,
    type: "NPM",
    name: "@demo/utils",
    version: "2.1.0",
    prerelease: false,
    reference: "@demo/utils@2.1.0",
    projectId: 1,
    projectPath: "demo",
    user: { id: 1, name: "admin", displayName: "Administrator" },
    publishDate: new Date(Date.now() - 7200000).toISOString(),
    size: 102400,
    labels: [{ id: 2, name: "stable", color: "#007bff" }],
    blobs: [{ id: 503, sha256Hash: "sha256:npm001", size: 102400 }],
  },
  {
    id: 3,
    type: "Maven",
    name: "com.example:my-lib",
    version: "1.3.2",
    prerelease: false,
    reference: "com.example:my-lib:1.3.2",
    projectId: 2,
    projectPath: "backend/shared-libs",
    user: { id: 2, name: "developer", displayName: "Dev User" },
    build: { id: 202, buildNumber: 15 },
    publishDate: new Date(Date.now() - 86400000).toISOString(),
    size: 4096000,
    labels: [],
    blobs: [
      { id: 504, sha256Hash: "sha256:mvn001", size: 2048000 },
      { id: 505, sha256Hash: "sha256:mvn002", size: 2048000 },
    ],
  },
  {
    id: 4,
    type: "PyPI",
    name: "my-python-pkg",
    version: "0.5.0",
    prerelease: true,
    reference: "my-python-pkg==0.5.0",
    projectId: 1,
    projectPath: "demo",
    user: { id: 2, name: "developer", displayName: "Dev User" },
    publishDate: new Date(Date.now() - 172800000).toISOString(),
    size: 51200,
    labels: [{ id: 3, name: "alpha", color: "#ffc107" }],
    blobs: [{ id: 506, sha256Hash: "sha256:pypi001", size: 51200 }],
  },
  {
    id: 5,
    type: "Helm",
    name: "my-app-chart",
    version: "1.0.0",
    prerelease: false,
    reference: "my-app-chart-1.0.0",
    projectId: 3,
    projectPath: "infra/charts",
    user: { id: 1, name: "admin", displayName: "Administrator" },
    publishDate: new Date(Date.now() - 259200000).toISOString(),
    size: 81920,
    labels: [{ id: 4, name: "release", color: "#17a2b8" }],
    blobs: [{ id: 507, sha256Hash: "sha256:helm001", size: 81920 }],
  },
  {
    id: 6,
    type: "Container Image",
    name: "api-server",
    version: "v1.5.3",
    prerelease: false,
    reference: "api-server:v1.5.3",
    projectId: 1,
    projectPath: "demo",
    build: { id: 103, buildNumber: 58 },
    publishDate: new Date(Date.now() - 432000000).toISOString(),
    size: 52428800,
    labels: [],
    blobs: [
      { id: 508, sha256Hash: "sha256:docker001", size: 26214400 },
      { id: 509, sha256Hash: "sha256:docker002", size: 26214400 },
    ],
  },
  {
    id: 7,
    type: "Ruby Gems",
    name: "my_gem",
    version: "3.0.1",
    prerelease: false,
    reference: "my_gem-3.0.1",
    projectId: 2,
    projectPath: "backend/shared-libs",
    user: { id: 2, name: "developer", displayName: "Dev User" },
    publishDate: new Date(Date.now() - 604800000).toISOString(),
    size: 307200,
    labels: [],
    blobs: [{ id: 510, sha256Hash: "sha256:gem001", size: 307200 }],
  },
  {
    id: 8,
    type: "NuGet",
    name: "MyDotNetLib",
    version: "2.0.0-beta1",
    prerelease: true,
    reference: "MyDotNetLib.2.0.0-beta1",
    projectId: 4,
    projectPath: "dotnet/libs",
    build: { id: 301, buildNumber: 12 },
    publishDate: new Date(Date.now() - 1209600000).toISOString(),
    size: 1536000,
    labels: [{ id: 5, name: "beta", color: "#fd7e14" }],
    blobs: [{ id: 511, sha256Hash: "sha256:nuget001", size: 1536000 }],
  },
];
