package job_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/job"
)

func TestFileLogReaderAndMaskSecrets(t *testing.T) {
	t.Setenv("BUILDX_SECRET_TOKEN", "supersecret")
	dir := t.TempDir()
	buildID := int64(42)
	logDir := filepath.Join(dir, "builds")
	_ = os.MkdirAll(logDir, 0755)
	path := filepath.Join(logDir, "42.log")
	_ = os.WriteFile(path, []byte("[2024-01-01T00:00:00Z] info: token supersecret\n"), 0644)

	reader := job.NewFileLogReader(dir)
	entries, err := reader.GetLogs(context.Background(), buildID, time.Time{})
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 {
		t.Fatalf("entries = %d", len(entries))
	}
	if entries[0].Message != "token ********" {
		t.Fatalf("message = %q", entries[0].Message)
	}
}
