package worker_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/hitzhangjie/buildx/buildx-server/internal/cache"
	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
	"github.com/hitzhangjie/buildx/buildx-server/internal/job"
	"github.com/hitzhangjie/buildx/buildx-server/internal/worker"
)

func newTestWorkerHandler(t *testing.T) *worker.Handler {
	t.Helper()
	svc := job.NewService(nil, nil, executor.NewRegistry(), nil, nil, nil)
	return worker.NewHandler(svc, cache.NewService(t.TempDir()))
}

func TestWorkerTestEndpoint(t *testing.T) {
	h := newTestWorkerHandler(t)
	r := chi.NewRouter()
	h.RegisterRoutes(r)

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/test", nil))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 without token, got %d", rec.Code)
	}

	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/test?token=x", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 with token, got %d", rec.Code)
	}
}

func TestWorkerJobDataInvalidToken(t *testing.T) {
	h := newTestWorkerHandler(t)
	r := chi.NewRouter()
	h.RegisterRoutes(r)

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/job-data?token=missing", nil))
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestRunServerStepRequestJSON(t *testing.T) {
	raw := `{"stepPosition":[0],"placeholderValues":{}}`
	var req job.RunServerStepRequest
	if err := json.Unmarshal([]byte(raw), &req); err != nil {
		t.Fatal(err)
	}
	if len(req.StepPosition) != 1 || req.StepPosition[0] != 0 {
		t.Fatalf("unexpected position: %v", req.StepPosition)
	}
}
