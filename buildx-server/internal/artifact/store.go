// Package artifact stores build artifacts for publish and dependency copy.
package artifact

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/hitzhangjie/buildx/buildx-server/internal/pathmatch"
)

// Store manages per-build artifact directories.
type Store struct {
	baseDir string
}

// NewStore creates an artifact store under baseDir (e.g. dataDir/artifacts).
func NewStore(baseDir string) *Store {
	return &Store{baseDir: baseDir}
}

// Dir returns the artifacts directory for a build, creating it if needed.
func (s *Store) Dir(projectID int64, buildNumber int) (string, error) {
	dir := filepath.Join(s.baseDir, fmt.Sprintf("%d", projectID), fmt.Sprintf("%d", buildNumber))
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}
	return dir, nil
}

// Publish copies files matching patterns from workDir (optionally under sourcePath) into artifacts storage.
func (s *Store) Publish(projectID int64, buildNumber int, workDir, sourcePath, patterns string) error {
	artifactsDir, err := s.Dir(projectID, buildNumber)
	if err != nil {
		return err
	}
	base := workDir
	if strings.TrimSpace(sourcePath) != "" {
		base = filepath.Join(workDir, strings.TrimPrefix(sourcePath, "./"))
	}
	info, err := os.Stat(base)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	walkRoot := base
	if !info.IsDir() {
		walkRoot = filepath.Dir(base)
	}

	return filepath.Walk(walkRoot, func(path string, fi os.FileInfo, err error) error {
		if err != nil || fi.IsDir() {
			return err
		}
		relToWork, err := filepath.Rel(workDir, path)
		if err != nil {
			return err
		}
		relToWork = filepath.ToSlash(relToWork)
		if !pathmatch.MatchAny(relToWork, patterns) {
			return nil
		}
		dest := filepath.Join(artifactsDir, relToWork)
		if err := os.MkdirAll(filepath.Dir(dest), 0755); err != nil {
			return err
		}
		return copyFile(path, dest)
	})
}

func copyFile(src, dest string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}

// CopyTo copies published artifacts matching patterns into destDir (for job dependencies).
func (s *Store) CopyTo(projectID int64, buildNumber int, patterns, destDir string) error {
	artifactsDir := filepath.Join(s.baseDir, fmt.Sprintf("%d", projectID), fmt.Sprintf("%d", buildNumber))
	if _, err := os.Stat(artifactsDir); os.IsNotExist(err) {
		return nil
	}
	return filepath.Walk(artifactsDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return err
		}
		rel, err := filepath.Rel(artifactsDir, path)
		if err != nil {
			return err
		}
		rel = filepath.ToSlash(rel)
		if !pathmatch.MatchAny(rel, patterns) {
			return nil
		}
		target := filepath.Join(destDir, rel)
		if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
			return err
		}
		return copyFile(path, target)
	})
}

// List returns relative artifact paths for a build.
func (s *Store) List(projectID int64, buildNumber int) ([]string, error) {
	artifactsDir := filepath.Join(s.baseDir, fmt.Sprintf("%d", projectID), fmt.Sprintf("%d", buildNumber))
	if _, err := os.Stat(artifactsDir); os.IsNotExist(err) {
		return []string{}, nil
	}
	var paths []string
	err := filepath.Walk(artifactsDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return err
		}
		rel, err := filepath.Rel(artifactsDir, path)
		if err != nil {
			return err
		}
		paths = append(paths, filepath.ToSlash(rel))
		return nil
	})
	if paths == nil {
		paths = []string{}
	}
	return paths, err
}

// Open returns a reader for a published artifact path.
func (s *Store) Open(projectID int64, buildNumber int, relPath string) (io.ReadCloser, error) {
	artifactsDir := filepath.Join(s.baseDir, fmt.Sprintf("%d", projectID), fmt.Sprintf("%d", buildNumber))
	clean := filepath.Clean(relPath)
	if strings.Contains(clean, "..") {
		return nil, fmt.Errorf("invalid artifact path")
	}
	path := filepath.Join(artifactsDir, clean)
	return os.Open(path)
}

// PublishReport records report metadata (files remain at path on disk).
func (s *Store) PublishReport(_ context.Context, projectID int64, buildNumber int, name, reportType, path string) error {
	dir, err := s.Dir(projectID, buildNumber)
	if err != nil {
		return err
	}
	metaPath := filepath.Join(dir, ".reports", name+".meta")
	if err := os.MkdirAll(filepath.Dir(metaPath), 0755); err != nil {
		return err
	}
	content := fmt.Sprintf("type=%s\npath=%s\n", reportType, path)
	return os.WriteFile(metaPath, []byte(content), 0644)
}
