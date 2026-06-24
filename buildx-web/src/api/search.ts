import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";
import {
  mockQuickSearch,
  mockTextSearch,
  mockFileSearch,
  mockSymbolSearch,
  type SearchFileHit,
  type SearchTextHit,
  type SearchSymbolHit,
} from "../mocks/fixtures/search";

export type { SearchFileHit, SearchTextHit, SearchSymbolHit };

export type SearchResult<T> = {
  hits: T[];
  hasMore: boolean;
};

export type TextSearchParams = {
  query: string;
  regex?: boolean;
  wholeWord?: boolean;
  caseSensitive?: boolean;
  fileNames?: string;
};

/**
 * Quick file name search — used by the Quick Search modal.
 * Matches file names against the query with case-insensitive contains matching.
 */
export async function searchFilesQuick(
  projectPath: string,
  revision: string,
  query: string,
  directory?: string,
): Promise<SearchResult<SearchFileHit>> {
  if (USE_MOCK) {
    return mockQuickSearch(revision, query, directory);
  }
  try {
    const params = new URLSearchParams({ revision, query });
    if (directory) params.set("directory", directory);
    params.set("maxResults", "15");
    return await apiFetch<SearchResult<SearchFileHit>>(
      `/~api/projects/${encodeURIComponent(projectPath)}/search/quick?${params}`,
    );
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404 || status === 501) {
      return { hits: [], hasMore: false };
    }
    throw err;
  }
}

/**
 * Advanced text content search — used by Advanced Search "Text" tab.
 * Supports regex, whole-word, and case-sensitive matching.
 */
export async function searchText(
  projectPath: string,
  revision: string,
  params: TextSearchParams,
  directory?: string,
): Promise<SearchResult<SearchTextHit>> {
  if (USE_MOCK) {
    return mockTextSearch(revision, params, directory);
  }
  try {
    const q = new URLSearchParams({ revision, query: params.query });
    if (params.regex) q.set("regex", "true");
    if (params.wholeWord) q.set("wholeWord", "true");
    if (params.caseSensitive) q.set("caseSensitive", "true");
    if (params.fileNames) q.set("fileNames", params.fileNames);
    if (directory) q.set("directory", directory);
    q.set("maxResults", "100");
    return await apiFetch<SearchResult<SearchTextHit>>(
      `/~api/projects/${encodeURIComponent(projectPath)}/search/text?${q}`,
    );
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404 || status === 501) {
      return { hits: [], hasMore: false };
    }
    throw err;
  }
}

/**
 * Advanced file name search — used by Advanced Search "Files" tab.
 * Supports wildcard patterns (* and ?).
 */
export async function searchFileNames(
  projectPath: string,
  revision: string,
  query: string,
  caseSensitive?: boolean,
  directory?: string,
): Promise<SearchResult<SearchFileHit>> {
  if (USE_MOCK) {
    return mockFileSearch(revision, query, caseSensitive, directory);
  }
  try {
    const params = new URLSearchParams({ revision, query });
    if (caseSensitive) params.set("caseSensitive", "true");
    if (directory) params.set("directory", directory);
    params.set("maxResults", "100");
    return await apiFetch<SearchResult<SearchFileHit>>(
      `/~api/projects/${encodeURIComponent(projectPath)}/search/files?${params}`,
    );
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404 || status === 501) {
      return { hits: [], hasMore: false };
    }
    throw err;
  }
}

/**
 * Advanced symbol search — used by Advanced Search "Symbols" tab.
 * Supports wildcard patterns (* and ?) on symbol names.
 */
export async function searchSymbols(
  projectPath: string,
  revision: string,
  query: string,
  caseSensitive?: boolean,
  fileNames?: string,
  directory?: string,
): Promise<SearchResult<SearchSymbolHit>> {
  if (USE_MOCK) {
    return mockSymbolSearch(revision, query, caseSensitive, fileNames, directory);
  }
  try {
    const params = new URLSearchParams({ revision, query });
    if (caseSensitive) params.set("caseSensitive", "true");
    if (fileNames) params.set("fileNames", fileNames);
    if (directory) params.set("directory", directory);
    params.set("maxResults", "100");
    return await apiFetch<SearchResult<SearchSymbolHit>>(
      `/~api/projects/${encodeURIComponent(projectPath)}/search/symbols?${params}`,
    );
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404 || status === 501) {
      return { hits: [], hasMore: false };
    }
    throw err;
  }
}
