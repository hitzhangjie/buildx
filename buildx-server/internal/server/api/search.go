package api

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
)

// SearchHandler serves file search endpoints for project repositories.
// These endpoints are dispatched from the BlobHandler.ServeHTTP wildcard route.
type SearchHandler struct {
	Projects projectService
	Security securityService
}

// searchResult wraps a list of hits with a hasMore flag. It is parameterised
// by the hit type via the Hits field. JSON serialization uses the concrete type
// stored in Hits.
type searchResult struct {
	Hits    any  `json:"hits"`
	HasMore bool `json:"hasMore"`
}

// SearchQuick handles GET /~api/projects/{projectPath}/search/quick.
// Query params: revision, query, caseSensitive (bool), directory, maxResults (default 15).
func (h *SearchHandler) SearchQuick(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "SearchHandler.SearchQuick")

	projectPath, ok := h.extractProjectPath(r, "/search/quick")
	if !ok {
		op.Fail(nil, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid project path", nil)
		return
	}
	op.With("project_path", projectPath)

	revision := r.URL.Query().Get("revision")
	query := r.URL.Query().Get("query")
	op.With("revision", revision, "query", query)

	if query == "" {
		op.OK(http.StatusOK, "hits", 0)
		writeJSON(w, r, http.StatusOK, searchResult{Hits: []git.SearchFileHit{}, HasMore: false})
		return
	}

	repo, err := h.openProjectRepo(r, projectPath)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if repo == nil {
		op.OK(http.StatusNotFound, "found", false)
		writeNotFound(w, r, "project", "project_path", projectPath)
		return
	}

	if revision == "" {
		revision = repo.DefaultRevision()
	}

	maxResults := 15
	if mr := r.URL.Query().Get("maxResults"); mr != "" {
		if n, err := strconv.Atoi(mr); err == nil && n > 0 {
			maxResults = n
		}
	}

	opts := git.SearchOptions{
		Revision:      revision,
		Query:         query,
		CaseSensitive: r.URL.Query().Get("caseSensitive") == "true",
		Directory:     r.URL.Query().Get("directory"),
		MaxResults:    maxResults,
	}

	hits, hasMore, err := repo.SearchFiles(r.Context(), opts)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if hits == nil {
		hits = []git.SearchFileHit{}
	}
	op.OK(http.StatusOK, "hits", len(hits), "has_more", hasMore)
	writeJSON(w, r, http.StatusOK, searchResult{Hits: hits, HasMore: hasMore})
}

// SearchText handles GET /~api/projects/{projectPath}/search/text.
// Query params: revision, query, regex (bool), wholeWord (bool), caseSensitive (bool),
// fileNames (comma-separated globs), directory, maxResults (default 100).
func (h *SearchHandler) SearchText(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "SearchHandler.SearchText")

	projectPath, ok := h.extractProjectPath(r, "/search/text")
	if !ok {
		op.Fail(nil, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid project path", nil)
		return
	}
	op.With("project_path", projectPath)

	revision := r.URL.Query().Get("revision")
	query := r.URL.Query().Get("query")
	op.With("revision", revision, "query_length", len(query))

	if query == "" {
		op.OK(http.StatusOK, "hits", 0)
		writeJSON(w, r, http.StatusOK, searchResult{Hits: []git.SearchTextHit{}, HasMore: false})
		return
	}

	repo, err := h.openProjectRepo(r, projectPath)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if repo == nil {
		op.OK(http.StatusNotFound, "found", false)
		writeNotFound(w, r, "project", "project_path", projectPath)
		return
	}

	if revision == "" {
		revision = repo.DefaultRevision()
	}

	maxResults := 100
	if mr := r.URL.Query().Get("maxResults"); mr != "" {
		if n, err := strconv.Atoi(mr); err == nil && n > 0 {
			maxResults = n
		}
	}

	opts := git.SearchOptions{
		Revision:      revision,
		Query:         query,
		CaseSensitive: r.URL.Query().Get("caseSensitive") == "true",
		Regex:         r.URL.Query().Get("regex") == "true",
		WholeWord:     r.URL.Query().Get("wholeWord") == "true",
		FileNames:     r.URL.Query().Get("fileNames"),
		Directory:     r.URL.Query().Get("directory"),
		MaxResults:    maxResults,
	}

	hits, hasMore, err := repo.SearchText(r.Context(), opts)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if hits == nil {
		hits = []git.SearchTextHit{}
	}
	op.OK(http.StatusOK, "hits", len(hits), "has_more", hasMore)
	writeJSON(w, r, http.StatusOK, searchResult{Hits: hits, HasMore: hasMore})
}

// SearchFiles handles GET /~api/projects/{projectPath}/search/files.
// Query params: revision, query, caseSensitive (bool), directory, maxResults (default 100).
// Uses wildcard matching for * and ? in the query.
func (h *SearchHandler) SearchFiles(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "SearchHandler.SearchFiles")

	projectPath, ok := h.extractProjectPath(r, "/search/files")
	if !ok {
		op.Fail(nil, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid project path", nil)
		return
	}
	op.With("project_path", projectPath)

	revision := r.URL.Query().Get("revision")
	query := r.URL.Query().Get("query")
	op.With("revision", revision, "query", query)

	if query == "" {
		op.OK(http.StatusOK, "hits", 0)
		writeJSON(w, r, http.StatusOK, searchResult{Hits: []git.SearchFileHit{}, HasMore: false})
		return
	}

	repo, err := h.openProjectRepo(r, projectPath)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if repo == nil {
		op.OK(http.StatusNotFound, "found", false)
		writeNotFound(w, r, "project", "project_path", projectPath)
		return
	}

	if revision == "" {
		revision = repo.DefaultRevision()
	}

	maxResults := 100
	if mr := r.URL.Query().Get("maxResults"); mr != "" {
		if n, err := strconv.Atoi(mr); err == nil && n > 0 {
			maxResults = n
		}
	}

	opts := git.SearchOptions{
		Revision:      revision,
		Query:         query,
		CaseSensitive: r.URL.Query().Get("caseSensitive") == "true",
		Directory:     r.URL.Query().Get("directory"),
		MaxResults:    maxResults,
	}

	hits, hasMore, err := repo.SearchFiles(r.Context(), opts)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if hits == nil {
		hits = []git.SearchFileHit{}
	}
	op.OK(http.StatusOK, "hits", len(hits), "has_more", hasMore)
	writeJSON(w, r, http.StatusOK, searchResult{Hits: hits, HasMore: hasMore})
}

// extractProjectPath extracts the project path from the chi wildcard param
// by removing the given suffix.
func (h *SearchHandler) extractProjectPath(r *http.Request, suffix string) (string, bool) {
	rest := chi.URLParam(r, "*")
	if rest == "" {
		return "", false
	}
	projectPath := strings.TrimSuffix(rest, suffix)
	if projectPath == rest || projectPath == "" {
		return "", false
	}
	return projectPath, true
}

// openProjectRepo looks up the project by path and opens its git repository.
func (h *SearchHandler) openProjectRepo(r *http.Request, projectPath string) (*git.Repository, error) {
	proj, err := h.Projects.GetByPath(r.Context(), projectPath)
	if err != nil {
		return nil, err
	}
	if proj == nil {
		return nil, nil
	}

	gitDir := h.Projects.GitDir(proj.ID)
	return git.Open(gitDir)
}
