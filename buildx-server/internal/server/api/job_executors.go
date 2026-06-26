package api

import (
	"errors"
	"net/http"

	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
	"github.com/hitzhangjie/buildx/buildx-server/internal/jobexecutorsetting"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

// JobExecutorDTO mirrors OneDev JobExecutor list entries for the admin UI and buildspec editor.
type JobExecutorDTO struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Enabled  bool   `json:"enabled"`
	JobMatch string `json:"jobMatch,omitempty"`
}

// JobExecutorsHandler serves GET/POST /~api/settings/job-executors.
type JobExecutorsHandler struct {
	Registry *executor.Registry
	Settings *jobexecutorsetting.DBStore
	Security securityService
}

// List handles GET /~api/settings/job-executors — mirrors OneDev SettingResource.getJobExecutors.
// Returns admin-saved executors only; empty list means auto-discover mode.
func (h *JobExecutorsHandler) List(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "JobExecutorsHandler.List")
	user, err := h.authenticateOptional(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	if user == nil {
		op.OK(http.StatusOK)
		writeJSON(w, r, http.StatusOK, []JobExecutorDTO{})
		return
	}

	saved, err := h.Settings.Get(r.Context())
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if len(saved) == 0 {
		op.OK(http.StatusOK)
		writeJSON(w, r, http.StatusOK, []JobExecutorDTO{})
		return
	}

	out := make([]JobExecutorDTO, 0, len(saved))
	for _, item := range saved {
		jobMatch := item.JobMatch
		if jobMatch == "" {
			jobMatch = "*"
		}
		typ := item.Type
		if typ == "" {
			typ = executorDisplayType(item.Name)
		}
		out = append(out, JobExecutorDTO{
			Name:     item.Name,
			Type:     typ,
			Enabled:  item.Enabled,
			JobMatch: jobMatch,
		})
	}
	op.OK(http.StatusOK)
	writeJSON(w, r, http.StatusOK, out)
}

// Save handles POST /~api/settings/job-executors — mirrors OneDev setJobExecutors.
func (h *JobExecutorsHandler) Save(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "JobExecutorsHandler.Save")
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	if user.ID != model.UserRootID {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	var items []JobExecutorDTO
	if err := decodeJSON(r, &items); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}

	saved := make([]jobexecutorsetting.SavedExecutor, 0, len(items))
	for _, item := range items {
		if item.Name == "" {
			continue
		}
		saved = append(saved, jobexecutorsetting.SavedExecutor{
			Name:     item.Name,
			Type:     item.Type,
			Enabled:  item.Enabled,
			JobMatch: item.JobMatch,
		})
		if err := h.Registry.UpdateConfig(item.Name, &executor.ExecutorConfig{
			Name:     item.Name,
			Enabled:  item.Enabled,
			JobMatch: item.JobMatch,
		}); err != nil {
			// Ignore unknown executor names — admin may save before plugin registers.
			continue
		}
	}
	if err := h.Settings.Save(r.Context(), saved); err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	h.Registry.SetAdminMode(len(saved) > 0)

	op.OK(http.StatusOK)
	w.WriteHeader(http.StatusOK)
}

func (h *JobExecutorsHandler) authenticate(r *http.Request) (*model.User, error) {
	if u := security.UserFromContext(r.Context()); u != nil {
		return u, nil
	}
	if user, pass, ok := r.BasicAuth(); ok {
		return h.Security.Authenticate(r.Context(), user, pass)
	}
	return nil, security.ErrUnauthorized
}

func (h *JobExecutorsHandler) authenticateOptional(r *http.Request) (*model.User, error) {
	user, err := h.authenticate(r)
	if errors.Is(err, security.ErrUnauthorized) {
		return nil, nil
	}
	return user, err
}

func executorDisplayType(name string) string {
	switch name {
	case "server-shell":
		return "Server Shell"
	case "server-docker":
		return "Server Docker"
	case "remote-shell":
		return "Remote Shell"
	case "remote-docker":
		return "Remote Docker"
	case "kubernetes":
		return "Kubernetes"
	default:
		return name
	}
}

// BuildSpecSuggestHandler serves buildspec editor suggestion endpoints.
type BuildSpecSuggestHandler struct {
	Registry *executor.Registry
}

// SuggestJobExecutors handles GET /~api/buildspec/suggest-job-executors.
func (h *BuildSpecSuggestHandler) SuggestJobExecutors(w http.ResponseWriter, r *http.Request) {
	jobName := r.URL.Query().Get("jobName")
	branch := r.URL.Query().Get("branch")
	if branch == "" {
		branch = "main"
	}
	match := &executor.MatchContext{
		ProjectPath: r.URL.Query().Get("projectPath"),
		Branch:      branch,
		JobName:     jobName,
	}
	jobCtx := &executor.JobContext{
		ProjectPath: match.ProjectPath,
		JobName:     jobName,
		RefName:     branch,
	}
	names := h.Registry.ListApplicableNames(r.Context(), jobCtx, match)
	writeJSON(w, r, http.StatusOK, names)
}
