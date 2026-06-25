// Package cache implements job cache storage (RunCacheService equivalent).
package cache

import (
	"archive/tar"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// Service stores and retrieves job caches on disk.
type Service struct {
	baseDir string
}

// NewService creates a cache service rooted at baseDir (e.g. dataDir/cache).
func NewService(baseDir string) *Service {
	return &Service{baseDir: baseDir}
}

// cacheKeyPath returns the directory for a (project, key, checksum) triple.
func (s *Service) cacheKeyPath(projectID int64, key, checksum string) string {
	safeKey := sanitize(key)
	safeChecksum := sanitize(checksum)
	if safeChecksum == "" {
		safeChecksum = "_empty_"
	}
	return filepath.Join(s.baseDir, fmt.Sprintf("%d", projectID), safeKey, safeChecksum)
}

func sanitize(v string) string {
	v = strings.TrimSpace(v)
	if v == "" {
		return "_"
	}
	replacer := strings.NewReplacer("/", "_", "\\", "_", "..", "_")
	return replacer.Replace(v)
}

// FindExact returns the cache archive path for an exact (key, checksum) match, or "" if missing.
func (s *Service) FindExact(projectID int64, key, checksum string) string {
	p := filepath.Join(s.cacheKeyPath(projectID, key, checksum), "cache.tar.gz")
	if _, err := os.Stat(p); err == nil {
		return p
	}
	return ""
}

// FindPartial returns a cache path matching key with any checksum (newest first), or "" if missing.
func (s *Service) FindPartial(projectID int64, key string) string {
	keyDir := filepath.Join(s.baseDir, fmt.Sprintf("%d", projectID), sanitize(key))
	entries, err := os.ReadDir(keyDir)
	if err != nil {
		return ""
	}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		p := filepath.Join(keyDir, e.Name(), "cache.tar.gz")
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	return ""
}

// Restore extracts a cache archive into workDir, restoring only relative paths under paths.
func (s *Service) Restore(archivePath, workDir string, paths []string) error {
	if archivePath == "" {
		return nil
	}
	f, err := os.Open(archivePath)
	if err != nil {
		return err
	}
	defer f.Close()

	gz, err := gzip.NewReader(f)
	if err != nil {
		return err
	}
	defer gz.Close()

	tr := tar.NewReader(gz)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		if hdr.Typeflag == tar.TypeDir {
			continue
		}
		rel := strings.TrimPrefix(hdr.Name, "./")
		if !shouldRestore(rel, paths) {
			continue
		}
		target := filepath.Join(workDir, rel)
		if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
			return err
		}
		out, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, os.FileMode(hdr.Mode))
		if err != nil {
			return err
		}
		if _, err := io.Copy(out, tr); err != nil {
			out.Close()
			return err
		}
		out.Close()
	}
	return nil
}

func shouldRestore(rel string, paths []string) bool {
	if len(paths) == 0 {
		return true
	}
	for _, p := range paths {
		p = strings.TrimPrefix(strings.TrimSpace(p), "./")
		if p == "" {
			return true
		}
		if rel == p || strings.HasPrefix(rel, p+"/") {
			return true
		}
	}
	return false
}

// Save creates a tar.gz cache from paths relative to workDir.
func (s *Service) Save(projectID int64, key, checksum, workDir string, paths []string) (string, error) {
	destDir := s.cacheKeyPath(projectID, key, checksum)
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return "", err
	}
	archivePath := filepath.Join(destDir, "cache.tar.gz")

	tmp, err := os.CreateTemp(destDir, "cache-*.tmp")
	if err != nil {
		return "", err
	}
	tmpPath := tmp.Name()

	gz := gzip.NewWriter(tmp)
	tw := tar.NewWriter(gz)

	if len(paths) == 0 {
		paths = []string{"."}
	}
	for _, p := range paths {
		p = strings.TrimPrefix(strings.TrimSpace(p), "./")
		src := filepath.Join(workDir, p)
		if err := addToTar(tw, workDir, src); err != nil {
			tw.Close()
			gz.Close()
			tmp.Close()
			os.Remove(tmpPath)
			return "", err
		}
	}

	if err := tw.Close(); err != nil {
		gz.Close()
		tmp.Close()
		os.Remove(tmpPath)
		return "", err
	}
	if err := gz.Close(); err != nil {
		tmp.Close()
		os.Remove(tmpPath)
		return "", err
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmpPath)
		return "", err
	}
	if err := os.Rename(tmpPath, archivePath); err != nil {
		os.Remove(tmpPath)
		return "", err
	}
	return archivePath, nil
}

func addToTar(tw *tar.Writer, workDir, src string) error {
	info, err := os.Stat(src)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	if !info.IsDir() {
		return addFile(tw, workDir, src)
	}
	return filepath.Walk(src, func(path string, fi os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if fi.IsDir() {
			return nil
		}
		return addFile(tw, workDir, path)
	})
}

func addFile(tw *tar.Writer, workDir, absPath string) error {
	rel, err := filepath.Rel(workDir, absPath)
	if err != nil {
		return err
	}
	rel = filepath.ToSlash(rel)
	f, err := os.Open(absPath)
	if err != nil {
		return err
	}
	defer f.Close()
	info, err := f.Stat()
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
	_, err = io.Copy(tw, f)
	return err
}

// ChecksumFiles computes a sha256 hex digest from file contents listed by glob patterns in workDir.
func ChecksumFiles(workDir, patternSpec string) (string, error) {
	if strings.TrimSpace(patternSpec) == "" {
		return "", nil
	}
	h := sha256.New()
	for _, pat := range strings.Fields(patternSpec) {
		pat = strings.TrimPrefix(pat, "./")
		matches, err := filepath.Glob(filepath.Join(workDir, pat))
		if err != nil {
			return "", err
		}
		for _, m := range matches {
			data, err := os.ReadFile(m)
			if err != nil {
				if os.IsNotExist(err) {
					continue
				}
				return "", err
			}
			rel, _ := filepath.Rel(workDir, m)
			_, _ = h.Write([]byte(rel + "\n"))
			_, _ = h.Write(data)
		}
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

// StreamDownload writes cache archive bytes to w. Returns found=false when missing.
func (s *Service) StreamDownload(projectID int64, key, checksum string, w io.Writer) (bool, error) {
	archive := s.FindExact(projectID, key, checksum)
	if archive == "" {
		archive = s.FindPartial(projectID, key)
	}
	if archive == "" {
		return false, nil
	}
	f, err := os.Open(archive)
	if err != nil {
		return false, err
	}
	defer f.Close()
	_, err = io.Copy(w, f)
	return true, err
}

// Upload saves cache payload from r using Save with empty paths (raw archive upload).
func (s *Service) Upload(projectID int64, key, checksum string, r io.Reader) error {
	destDir := s.cacheKeyPath(projectID, key, checksum)
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return err
	}
	archivePath := filepath.Join(destDir, "cache.tar.gz")
	tmp, err := os.CreateTemp(destDir, "upload-*.tmp")
	if err != nil {
		return err
	}
	tmpPath := tmp.Name()
	if _, err := io.Copy(tmp, r); err != nil {
		tmp.Close()
		os.Remove(tmpPath)
		return err
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmpPath)
		return err
	}
	return os.Rename(tmpPath, archivePath)
}
