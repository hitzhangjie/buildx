package cache_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/cache"
)

func TestRunCache_SaveRestore(t *testing.T) {
	tmp := t.TempDir()
	workDir := filepath.Join(tmp, "work")
	if err := os.MkdirAll(filepath.Join(workDir, "node_modules"), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(workDir, "node_modules", "dep.txt"), []byte("cached"), 0644); err != nil {
		t.Fatal(err)
	}

	svc := cache.NewService(filepath.Join(tmp, "cache"))
	_, err := svc.Save(1, "npm", "abc", workDir, []string{"node_modules"})
	if err != nil {
		t.Fatal(err)
	}

	restoreDir := filepath.Join(tmp, "restore")
	if err := os.MkdirAll(restoreDir, 0755); err != nil {
		t.Fatal(err)
	}
	archive := svc.FindExact(1, "npm", "abc")
	if archive == "" {
		t.Fatal("expected cache archive")
	}
	if err := svc.Restore(archive, restoreDir, []string{"node_modules"}); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(filepath.Join(restoreDir, "node_modules", "dep.txt"))
	if err != nil || string(data) != "cached" {
		t.Fatalf("restore: %q err=%v", data, err)
	}
}
