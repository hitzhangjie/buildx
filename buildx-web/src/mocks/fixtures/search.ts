/**
 * Mock search fixtures — walk the in-memory mockTree from blob.ts to simulate
 * file name and text content search without a running server.
 */

import { type SearchResult } from "../../api/search";

// ---------------------------------------------------------------------------
// Types (mirror backend git/search types)
// ---------------------------------------------------------------------------

export type SearchFileHit = {
  filePath: string;
  fileName: string;
  match?: { from: number; to: number };
};

export type SearchTextHit = {
  filePath: string;
  lineNo: number;
  lineContent: string;
  match?: { fromRow: number; fromCol: number; toRow: number; toCol: number };
};

export type SearchSymbolHit = {
  filePath: string;
  symbolName: string;
  symbolType?: string;
  namespace?: string;
  lineNo: number;
  lineContent: string;
  match?: { from: number; to: number };
};

// ---------------------------------------------------------------------------
// Mock tree types (keep in sync with blob.ts)
// ---------------------------------------------------------------------------

type MockNode = {
  type: "file" | "directory";
  content?: string;
  children?: Record<string, MockNode>;
};

// Lazily import the mock tree to avoid circular dependencies at module init.
let _mockTree: MockNode | undefined;
function getMockTree(): MockNode {
  if (_mockTree) return _mockTree;
  // Inline the same tree structure used in blob.ts for standalone usage.
  _mockTree = {
    type: "directory",
    children: {
      "README.md": {
        type: "file",
        content: "# Demo Project\n\nWelcome to BuildX.\n",
      },
      src: {
        type: "directory",
        children: {
          "main.go": {
            type: "file",
            content: "package main\n\nimport \"fmt\"\n\nfunc main() {\n\tfmt.Println(\"hello buildx\")\n}\n",
          },
          lib: {
            type: "directory",
            children: {
              "util.go": {
                type: "file",
                content: "package lib\n\nfunc Greet(name string) string {\n\treturn \"hello \" + name\n}\n",
              },
            },
          },
        },
      },
      docs: {
        type: "directory",
        children: {
          "index.md": {
            type: "file",
            content: "# Documentation\n",
          },
        },
      },
    },
  };
  return _mockTree;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function walkTree(
  node: MockNode,
  prefix: string,
  directory?: string,
): { path: string; name: string; node: MockNode }[] {
  if (node.type !== "directory" || !node.children) return [];

  const results: { path: string; name: string; node: MockNode }[] = [];
  for (const [name, child] of Object.entries(node.children)) {
    const fullPath = prefix ? `${prefix}/${name}` : name;
    // Filter by directory if specified.
    if (directory && !fullPath.startsWith(directory + "/") && fullPath !== directory) {
      if (child.type === "directory") {
        results.push(...walkTree(child, fullPath, directory));
      }
      continue;
    }
    results.push({ path: fullPath, name, node: child });
    if (child.type === "directory") {
      results.push(...walkTree(child, fullPath));
    }
  }
  return results;
}

function wildcardMatch(name: string, pattern: string, caseSensitive: boolean): boolean {
  let p = pattern;
  let n = name;
  if (!caseSensitive) {
    p = p.toLowerCase();
    n = n.toLowerCase();
  }
  // Simple glob: * matches any sequence, ? matches any single character.
  return globMatch(p, n);
}

function globMatch(pattern: string, name: string): boolean {
  let px = 0, nx = 0;
  let nextPx = 0, nextNx = 0;
  let starred = false;

  while (px < pattern.length || nx < name.length) {
    if (px < pattern.length) {
      const c = pattern[px];
      if (c === "?") {
        if (nx < name.length) { px++; nx++; continue; }
      } else if (c === "*") {
        starred = true;
        nextPx = px;
        nextNx = nx + 1;
        px++;
        continue;
      } else {
        if (nx < name.length && c === name[nx]) { px++; nx++; continue; }
      }
    }
    if (starred) {
      px = nextPx + 1;
      nx = nextNx;
      if (nx < name.length) { nextNx++; continue; }
    }
    return false;
  }
  return true;
}

function isWordBoundary(s: string, start: number, end: number): boolean {
  const leftOk = start === 0 || !isWordChar(s.charCodeAt(start - 1));
  const rightOk = end >= s.length || !isWordChar(s.charCodeAt(end));
  return leftOk && rightOk;
}

function isWordChar(c: number): boolean {
  return (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95;
}

// ---------------------------------------------------------------------------
// Mock search implementations
// ---------------------------------------------------------------------------

export function mockQuickSearch(
  _revision: string,
  query: string,
  directory?: string,
): SearchResult<SearchFileHit> {
  if (!query) return { hits: [], hasMore: false };

  const tree = getMockTree();
  const allFiles = walkTree(tree, "", directory).filter((e) => e.node.type === "file");
  const MAX = 15;

  const hits: SearchFileHit[] = [];
  for (const f of allFiles) {
    const idx = f.name.toLowerCase().indexOf(query.toLowerCase());
    if (idx >= 0) {
      hits.push({
        filePath: f.path,
        fileName: f.name,
        match: { from: idx, to: idx + query.length },
      });
      if (hits.length >= MAX) break;
    }
  }
  return { hits, hasMore: hits.length >= MAX && allFiles.length > hits.length };
}

export function mockTextSearch(
  _revision: string,
  params: {
    query: string;
    regex?: boolean;
    wholeWord?: boolean;
    caseSensitive?: boolean;
    fileNames?: string;
  },
  directory?: string,
): SearchResult<SearchTextHit> {
  if (!params.query) return { hits: [], hasMore: false };

  const tree = getMockTree();
  const allFiles = walkTree(tree, "", directory).filter((e) => e.node.type === "file");

  // Parse file-name patterns if provided.
  const filePatterns = params.fileNames
    ? params.fileNames.split(",").map((p) => p.trim()).filter(Boolean)
    : [];

  const MAX = 100;
  const hits: SearchTextHit[] = [];

  let regex: RegExp | null = null;
  if (params.regex) {
    try {
      regex = new RegExp(params.query, params.caseSensitive ? "g" : "gi");
    } catch {
      return { hits: [], hasMore: false };
    }
  }

  for (const f of allFiles) {
    if (!f.node.content) continue;

    // Filter by file-name patterns.
    if (filePatterns.length > 0) {
      const matched = filePatterns.some((p) => wildcardMatch(f.name, p, params.caseSensitive ?? false));
      if (!matched) continue;
    }

    const lines = f.node.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let matchRange: { fromRow: number; fromCol: number; toRow: number; toCol: number } | undefined;

      if (regex) {
        // Reset lastIndex since we reuse the regex.
        regex.lastIndex = 0;
        const m = regex.exec(line);
        if (m) {
          matchRange = {
            fromRow: 0, fromCol: m.index,
            toRow: 0, toCol: m.index + m[0].length,
          };
        }
      } else {
        const searchLine = params.caseSensitive ? line : line.toLowerCase();
        const searchQuery = params.caseSensitive ? params.query : params.query.toLowerCase();

        let idx = 0;
        while (idx <= searchLine.length - searchQuery.length) {
          if (searchLine.substring(idx, idx + searchQuery.length) === searchQuery) {
            if (params.wholeWord && !isWordBoundary(searchLine, idx, idx + searchQuery.length)) {
              idx++;
              continue;
            }
            matchRange = {
              fromRow: 0, fromCol: idx,
              toRow: 0, toCol: idx + searchQuery.length,
            };
            break;
          }
          idx++;
        }
      }

      if (matchRange) {
        hits.push({
          filePath: f.path,
          lineNo: i + 1,
          lineContent: line,
          match: matchRange,
        });
        if (hits.length >= MAX) break;
      }
    }
    if (hits.length >= MAX) break;
  }

  return { hits, hasMore: hits.length >= MAX };
}

export function mockFileSearch(
  _revision: string,
  query: string,
  caseSensitive?: boolean,
  directory?: string,
): SearchResult<SearchFileHit> {
  if (!query) return { hits: [], hasMore: false };

  const tree = getMockTree();
  const allFiles = walkTree(tree, "", directory).filter((e) => e.node.type === "file");
  const MAX = 100;

  const hits: SearchFileHit[] = [];
  for (const f of allFiles) {
    if (wildcardMatch(f.name, query, caseSensitive ?? false)) {
      hits.push({
        filePath: f.path,
        fileName: f.name,
      });
      if (hits.length >= MAX) break;
    }
  }
  return { hits, hasMore: hits.length >= MAX };
}

function extractMockSymbols(
  content: string,
): { name: string; type: string; lineNo: number; lineContent: string; namespace: string }[] {
  const lines = content.split("\n");
  let namespace = "";
  const symbols: { name: string; type: string; lineNo: number; lineContent: string; namespace: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("package ")) {
      namespace = trimmed.split(/\s+/)[1] ?? "";
    }
    const funcMatch = /^\s*func\s+(?:\([^)]*\)\s+)?([A-Za-z_]\w*)\s*[\(<]/.exec(line);
    if (funcMatch) {
      symbols.push({ name: funcMatch[1], type: "func", lineNo: i + 1, lineContent: line, namespace });
    }
    const typeMatch = /^\s*type\s+([A-Za-z_]\w*)\s+(?:struct|interface)/.exec(line);
    if (typeMatch) {
      symbols.push({ name: typeMatch[1], type: "type", lineNo: i + 1, lineContent: line, namespace });
    }
  }
  return symbols;
}

export function mockSymbolSearch(
  _revision: string,
  query: string,
  caseSensitive?: boolean,
  fileNames?: string,
  directory?: string,
): SearchResult<SearchSymbolHit> {
  if (!query || /^[*?]+$/.test(query)) {
    return { hits: [], hasMore: false };
  }

  const tree = getMockTree();
  const allFiles = walkTree(tree, "", directory).filter((e) => e.node.type === "file");
  const filePatterns = fileNames
    ? fileNames.split(",").map((p) => p.trim()).filter(Boolean)
    : [];
  const MAX = 100;
  const hits: SearchSymbolHit[] = [];

  for (const f of allFiles) {
    if (!f.node.content) continue;
    if (filePatterns.length > 0) {
      const matched = filePatterns.some((p) => wildcardMatch(f.name, p, caseSensitive ?? false));
      if (!matched) continue;
    }

    for (const sym of extractMockSymbols(f.node.content)) {
      if (wildcardMatch(query, sym.name, caseSensitive ?? false)) {
        hits.push({
          filePath: f.path,
          symbolName: sym.name,
          symbolType: sym.type,
          namespace: sym.namespace || undefined,
          lineNo: sym.lineNo,
          lineContent: sym.lineContent,
        });
        if (hits.length >= MAX) {
          return { hits, hasMore: true };
        }
      }
    }
  }

  return { hits, hasMore: false };
}
