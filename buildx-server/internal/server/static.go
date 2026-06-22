package server

import (
	"embed"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"strings"
)

// Embedded UI from buildx-web (synced to webdist/ before go build).
//
//go:embed webdist/*
var embeddedWeb embed.FS

// webHandler serves BUILDX_WEB_DIR when set, otherwise the embedded SPA from buildx-web.
func webHandler(webDir string) http.Handler {
	if webDir != "" {
		if info, err := os.Stat(webDir); err == nil && info.IsDir() {
			slog.Info("serving web ui from disk", "dir", webDir)
			return spaFileServer(http.Dir(webDir))
		}
		slog.Warn("BUILDX_WEB_DIR not found, using embedded web ui", "dir", webDir)
	}

	sub, err := fs.Sub(embeddedWeb, "webdist")
	if err != nil {
		panic("embedded web ui: " + err.Error())
	}
	return spaFileServer(http.FS(sub))
}

// spaFileServer serves static files and falls back to index.html for client routes.
func spaFileServer(content http.FileSystem) http.Handler {
	fileServer := http.FileServer(content)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}
		if f, err := content.Open(path); err == nil {
			_ = f.Close()
			fileServer.ServeHTTP(w, r)
			return
		}
		r2 := r.Clone(r.Context())
		r2.URL.Path = "/"
		fileServer.ServeHTTP(w, r2)
	})
}
