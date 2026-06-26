package api

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"
)

// BuildSpecHandler serves buildspec validation endpoints.
type BuildSpecHandler struct{}

type validateBuildSpecRequest struct {
	Content string `json:"content"`
}

type validateBuildSpecResponse struct {
	Valid  bool     `json:"valid"`
	Errors []string `json:"errors,omitempty"`
}

// Validate handles POST /~api/buildspec/validate
func (h *BuildSpecHandler) Validate(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "failed to read body", http.StatusBadRequest)
		return
	}
	var req validateBuildSpecRequest
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	spec, err := buildspec.Parse([]byte(req.Content))
	if err != nil {
		writeBuildSpecJSON(w, validateBuildSpecResponse{
			Valid:  false,
			Errors: []string{err.Error()},
		})
		return
	}

	if err := spec.Validate(); err != nil {
		msg := err.Error()
		var errors []string
		if strings.Contains(msg, "\n") {
			for _, line := range strings.Split(msg, "\n") {
				line = strings.TrimSpace(line)
				if line != "" {
					errors = append(errors, line)
				}
			}
		} else {
			errors = []string{msg}
		}
		writeBuildSpecJSON(w, validateBuildSpecResponse{Valid: false, Errors: errors})
		return
	}

	writeBuildSpecJSON(w, validateBuildSpecResponse{Valid: true})
}

func writeBuildSpecJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(v)
}
