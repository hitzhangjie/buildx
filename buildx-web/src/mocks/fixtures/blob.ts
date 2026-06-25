export type BlobCommitInfo = {
  author: string;
  message: string;
  when: string;
};

export type BlobEntry = {
  name: string;
  path: string;
  type: "file" | "directory";
  lastCommit?: BlobCommitInfo;
};

export type BlobContent = {
  revision: string;
  commitHash?: string;
  path: string;
  type: "directory" | "file";
  entries?: BlobEntry[];
  content?: string;
  size?: number;
};

type MockNode = {
  type: "file" | "directory";
  content?: string;
  children?: Record<string, MockNode>;
  lastCommit?: BlobCommitInfo;
};

const DEFAULT_COMMIT: BlobCommitInfo = {
  author: "admin",
  message: "Initial commit",
  when: "2 days ago",
};

const mockTree: MockNode = {
  type: "directory",
  children: {
    "README.md": {
      type: "file",
      content: "# Demo Project\n\nWelcome to BuildX.\n",
      lastCommit: DEFAULT_COMMIT,
    },
    src: {
      type: "directory",
      lastCommit: DEFAULT_COMMIT,
      children: {
        "main.go": {
          type: "file",
          content: "package main\n\nimport \"fmt\"\n\nfunc main() {\n\tfmt.Println(\"hello buildx\")\n}\n",
          lastCommit: DEFAULT_COMMIT,
        },
        lib: {
          type: "directory",
          lastCommit: DEFAULT_COMMIT,
          children: {
            "util.go": {
              type: "file",
              content: "package lib\n\nfunc Greet(name string) string {\n\treturn \"hello \" + name\n}\n",
              lastCommit: DEFAULT_COMMIT,
            },
          },
        },
      },
    },
    docs: {
      type: "directory",
      lastCommit: DEFAULT_COMMIT,
      children: {
        "index.md": {
          type: "file",
          content: "# Documentation\n",
          lastCommit: DEFAULT_COMMIT,
        },
      },
    },
  },
};

function resolveNode(path: string): MockNode | null {
  if (!path) {
    return mockTree;
  }
  const parts = path.split("/").filter(Boolean);
  let node: MockNode | undefined = mockTree;
  for (const part of parts) {
    if (!node?.children?.[part]) {
      return null;
    }
    node = node.children[part];
  }
  return node ?? null;
}

function listEntries(path: string, node: MockNode): BlobEntry[] {
  if (!node.children) {
    return [];
  }
  return Object.entries(node.children)
    .map(([name, child]) => ({
      name,
      path: path ? `${path}/${name}` : name,
      type: child.type,
      lastCommit: child.lastCommit ?? DEFAULT_COMMIT,
    }))
    .sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
}

/** Toggle to simulate an empty project (no commits yet) in mock mode. */
export let MOCK_EMPTY_PROJECT = false;

/** Enable/disable empty project simulation for development testing. */
export function setMockEmptyProject(empty: boolean) {
  MOCK_EMPTY_PROJECT = empty;
}

export function getMockBlob(revision: string, path: string): BlobContent | null {
  if (revision !== "main") {
    return null;
  }
  // When simulating an empty project, return null at root to trigger NoCommitsPanel.
  if (MOCK_EMPTY_PROJECT && path === "") {
    return null;
  }
  const node = resolveNode(path);
  if (!node) {
    return null;
  }
  if (node.type === "directory") {
    return {
      revision,
      commitHash: "mock0000000000000000000000000000000001",
      path,
      type: "directory",
      entries: listEntries(path, node),
    };
  }
  return {
    revision,
    commitHash: "mock0000000000000000000000000000000001",
    path,
    type: "file",
    content: node.content ?? "",
    size: new Blob([node.content ?? ""]).size,
  };
}

export function getMockReadme(path: string): { title: string; content: string } | null {
  if (path !== "") {
    return null;
  }
  const readme = mockTree.children?.["README.md"];
  if (!readme?.content) {
    return null;
  }
  return { title: "README.md", content: readme.content };
}

/**
 * Create a new file in the in-memory mock tree.
 * Also creates intermediate directories as needed.
 */
export function createMockFile(
  _revision: string,
  path: string,
  content: string,
  commitMessage: string,
): void {
  if (!path) return;
  const parts = path.split("/");
  const fileName = parts.pop()!;

  // Walk / create intermediate directories
  let node = mockTree;
  for (const part of parts) {
    if (!node.children) node.children = {};
    if (!node.children[part]) {
      node.children[part] = { type: "directory", children: {} };
    }
    node = node.children[part];
    if (node.type !== "directory") {
      // Path exists as a file — can't create file under it
      throw new Error(`Cannot create file: "${part}" is not a directory`);
    }
  }

  if (!node.children) node.children = {};
  node.children[fileName] = {
    type: "file",
    content,
    lastCommit: {
      author: "admin",
      message: commitMessage,
      when: "just now",
    },
  };
}

/**
 * Update an existing file in the in-memory mock tree.
 */
export function updateMockFile(
  _revision: string,
  path: string,
  content: string,
  commitMessage: string,
): void {
  if (!path) return;
  const node = resolveNode(path);
  if (!node || node.type !== "file") {
    throw new Error(`File not found: ${path}`);
  }
  node.content = content;
  node.lastCommit = {
    author: "admin",
    message: commitMessage,
    when: "just now",
  };
}

/**
 * Delete a file from the in-memory mock tree.
 */
export function deleteMockFile(_revision: string, filePath: string, commitMessage: string): void {
  if (!filePath) return;
  const parts = filePath.split("/");
  const fileName = parts.pop()!;

  let parent = mockTree;
  for (const part of parts) {
    if (!parent.children?.[part]) {
      throw new Error(`File not found: ${filePath}`);
    }
    parent = parent.children[part];
  }

  if (!parent.children?.[fileName] || parent.children[fileName].type !== "file") {
    throw new Error(`File not found: ${filePath}`);
  }
  delete parent.children[fileName];
  parent.lastCommit = {
    author: "admin",
    message: commitMessage,
    when: "just now",
  };
}
