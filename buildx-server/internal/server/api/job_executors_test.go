package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
	"github.com/hitzhangjie/buildx/buildx-server/internal/server/api"
)

func TestBuildSpecSuggestHandler_SuggestJobExecutors(t *testing.T) {
	reg := executor.NewRegistry()
	reg.Register(executor.NewServerShellExecutor(t.TempDir()), &executor.ExecutorConfig{
		Name: "server-shell", Enabled: true, JobMatch: "*",
	})
	reg.Register(executor.NewRemoteShellExecutor(nil), &executor.ExecutorConfig{
		Name: "remote-shell", Enabled: true, JobMatch: "ci",
	})

	h := &api.BuildSpecSuggestHandler{Registry: reg}
	req := httptest.NewRequest(http.MethodGet, "/~api/buildspec/suggest-job-executors?jobName=ci&branch=main", nil)
	rec := httptest.NewRecorder()
	h.SuggestJobExecutors(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d body %s", rec.Code, rec.Body.String())
	}
	var names []string
	if err := json.Unmarshal(rec.Body.Bytes(), &names); err != nil {
		t.Fatal(err)
	}
	if len(names) == 0 {
		t.Fatal("expected suggestions")
	}
}
