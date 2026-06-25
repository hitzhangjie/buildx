// Package worker implements the internal worker REST API used by build agents.
// Maps to OneDev's WorkerResource at /~api/worker.
package worker

import (
	"archive/tar"
	"compress/gzip"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/hitzhangjie/buildx/buildx-server/internal/cache"
	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
	"github.com/hitzhangjie/buildx/buildx-server/internal/job"
)

// Handler serves /~api/worker/* endpoints (internal, token-authenticated).
type Handler struct {
	Jobs  *job.Service
	Cache *cache.Service
}

// NewHandler creates a worker API handler.
func NewHandler(jobs *job.Service, cacheSvc *cache.Service) *Handler {
	return &Handler{Jobs: jobs, Cache: cacheSvc}
}

// RegisterRoutes mounts worker routes (expects /worker route prefix).
func (h *Handler) RegisterRoutes(mux interface {
	Get(pattern string, handlerFn http.HandlerFunc)
	Post(pattern string, handlerFn http.HandlerFunc)
	Head(pattern string, handlerFn http.HandlerFunc)
}) {
	mux.Get("/test", h.handleTest)
	mux.Get("/job-data", h.handleJobData)
	mux.Post("/run-server-step", h.handleRunServerStep)
	mux.Get("/dependencies", h.handleDependencies)
	mux.Get("/job-cache", h.handleDownloadJobCache)
	mux.Head("/job-cache", h.handleHeadJobCache)
	mux.Post("/job-cache", h.handleUploadJobCache)
}

func (h *Handler) handleTest(w http.ResponseWriter, r *http.Request) {
	if r.URL.Query().Get("token") == "" {
		http.Error(w, "missing token", http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (h *Handler) handleJobData(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "missing token", http.StatusUnauthorized)
		return
	}
	if workDir := r.URL.Query().Get("workDir"); workDir != "" {
		h.Jobs.ReportJobWorkDir(token, workDir)
	}
	data, err := h.Jobs.JobDataForWorker(token)
	if err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(data)
}

func (h *Handler) handleRunServerStep(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "missing token", http.StatusUnauthorized)
		return
	}
	var req job.RunServerStepRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	logger := executor.NewBuildLogger(0)
	result, err := h.Jobs.RunServerStep(r.Context(), token, req, logger)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}

func (h *Handler) handleDependencies(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "missing token", http.StatusUnauthorized)
		return
	}
	dest, err := os.MkdirTemp("", "worker-deps-*")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer os.RemoveAll(dest)
	if err := h.Jobs.CopyDependencies(r.Context(), token, dest); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/gzip")
	gz := gzip.NewWriter(w)
	tw := tar.NewWriter(gz)
	if err := tarDirectory(dest, tw); err != nil {
		_ = tw.Close()
		_ = gz.Close()
		return
	}
	_ = tw.Close()
	_ = gz.Close()
}

func (h *Handler) handleDownloadJobCache(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	key := r.URL.Query().Get("key")
	checksum := r.URL.Query().Get("checksum")
	if token == "" || key == "" {
		http.Error(w, "missing token or key", http.StatusBadRequest)
		return
	}
	active, err := h.Jobs.GetJobContext(token, true)
	if err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}
	if h.Cache == nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	found, err := h.Cache.StreamDownload(active.JobCtx.ProjectID, key, checksum, w)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if !found {
		w.WriteHeader(http.StatusNotFound)
	}
}

func (h *Handler) handleHeadJobCache(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "missing token", http.StatusUnauthorized)
		return
	}
	if _, err := h.Jobs.GetJobContext(token, true); err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (h *Handler) handleUploadJobCache(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	key := r.URL.Query().Get("key")
	checksum := r.URL.Query().Get("checksum")
	if token == "" || key == "" {
		http.Error(w, "missing token or key", http.StatusBadRequest)
		return
	}
	active, err := h.Jobs.GetJobContext(token, true)
	if err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}
	if h.Cache == nil {
		http.Error(w, "cache not configured", http.StatusServiceUnavailable)
		return
	}
	if err := h.Cache.Upload(active.JobCtx.ProjectID, key, checksum, r.Body); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func tarDirectory(src string, tw *tar.Writer) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		hdr, err := tar.FileInfoHeader(info, rel)
		if err != nil {
			return err
		}
		hdr.Name = rel
		if err := tw.WriteHeader(hdr); err != nil {
			return err
		}
		f, err := os.Open(path)
		if err != nil {
			return err
		}
		defer f.Close()
		_, err = io.Copy(tw, f)
		return err
	})
}
