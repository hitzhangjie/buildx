package api

import (
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

// AvatarHandler serves project avatar upload and retrieval.
// Mirrors OneDev's AvatarService — file-based storage, not REST.
type AvatarHandler struct {
	Projects projectService
	Security securityService
}

// Upload handles multipart project avatar upload.
// POST /~api/projects/{projectId}/avatar
func (h *AvatarHandler) Upload(w http.ResponseWriter, r *http.Request, projectID int64) {
	op := StartOp(r, "AvatarHandler.Upload", "project_id", projectID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	ok, err := h.Security.IsProjectOwner(r.Context(), user.ID, projectID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !ok {
		op.Fail(errors.New("forbidden"), http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	// Parse multipart form (max 1MB).
	if err := r.ParseMultipartForm(1 << 20); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid multipart form", err)
		return
	}

	file, header, err := r.FormFile("avatar")
	if err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "missing avatar file", err)
		return
	}
	defer file.Close()

	// Validate content type.
	contentType := header.Header.Get("Content-Type")
	if !isValidImageType(contentType) {
		op.Fail(errors.New("invalid image type"), http.StatusBadRequest)
		http.Error(w, "invalid image type: "+contentType, http.StatusBadRequest)
		return
	}

	// Determine file extension.
	ext := imageExtension(contentType)
	if ext == "" {
		ext = ".png"
	}

	// Save avatar to project directory.
	projectDir := h.Projects.ProjectDir(projectID)
	avatarDir := filepath.Join(projectDir, "avatar")
	if err := os.MkdirAll(avatarDir, 0o750); err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	// Write to a temporary file first, then rename.
	tmpPath := filepath.Join(avatarDir, "avatar.tmp")
	finalPath := filepath.Join(avatarDir, "avatar"+ext)

	dst, err := os.Create(tmpPath)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if _, err := io.Copy(dst, file); err != nil {
		dst.Close()
		os.Remove(tmpPath)
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	dst.Close()

	// Remove old avatar files (any extension).
	entries, _ := os.ReadDir(avatarDir)
	for _, e := range entries {
		if !e.IsDir() && strings.HasPrefix(e.Name(), "avatar") && e.Name() != "avatar.tmp" {
			os.Remove(filepath.Join(avatarDir, e.Name()))
		}
	}

	if err := os.Rename(tmpPath, finalPath); err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	op.OK(http.StatusOK)
	writeJSON(w, r, http.StatusOK, map[string]string{"status": "ok"})
}

// Serve serves the project avatar image.
// GET /~api/projects/{projectId}/avatar
func (h *AvatarHandler) Serve(w http.ResponseWriter, r *http.Request, projectID int64) {
	projectDir := h.Projects.ProjectDir(projectID)
	avatarDir := filepath.Join(projectDir, "avatar")

	// Find the avatar file (any extension).
	var avatarPath string
	entries, err := os.ReadDir(avatarDir)
	if err != nil {
		h.serveDefault(w, r)
		return
	}
	for _, e := range entries {
		if !e.IsDir() && strings.HasPrefix(e.Name(), "avatar") && e.Name() != "avatar.tmp" {
			avatarPath = filepath.Join(avatarDir, e.Name())
			break
		}
	}
	if avatarPath == "" {
		h.serveDefault(w, r)
		return
	}

	// Determine content type from extension.
	ext := strings.ToLower(filepath.Ext(avatarPath))
	contentType := "image/png"
	switch ext {
	case ".jpg", ".jpeg":
		contentType = "image/jpeg"
	case ".gif":
		contentType = "image/gif"
	case ".svg":
		contentType = "image/svg+xml"
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=3600")
	http.ServeFile(w, r, avatarPath)
}

func (h *AvatarHandler) serveDefault(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	// 1x1 transparent PNG
	defaultPNG := []byte{
		0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
		0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
		0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
		0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
		0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
		0x54, 0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02,
		0x00, 0x01, 0xE5, 0x27, 0xDE, 0xFC, 0x00, 0x00,
		0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42,
		0x60, 0x82,
	}
	_, _ = w.Write(defaultPNG)
}

func (h *AvatarHandler) authenticate(r *http.Request) (*security.User, error) {
	if u := security.UserFromContext(r.Context()); u != nil {
		return u, nil
	}
	if user, pass, ok := r.BasicAuth(); ok {
		return h.Security.Authenticate(r.Context(), user, pass)
	}
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(strings.ToLower(auth), "bearer ") {
		token := strings.TrimSpace(auth[7:])
		return h.Security.AuthenticateToken(r.Context(), token)
	}
	return nil, security.ErrUnauthorized
}

func isValidImageType(ct string) bool {
	return ct == "image/png" || ct == "image/jpeg" || ct == "image/gif" || ct == "image/svg+xml"
}

func imageExtension(ct string) string {
	switch ct {
	case "image/png":
		return ".png"
	case "image/jpeg":
		return ".jpg"
	case "image/gif":
		return ".gif"
	case "image/svg+xml":
		return ".svg"
	}
	return ""
}
