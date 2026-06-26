package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestBuildSpecHandler_Validate_Valid(t *testing.T) {
	h := &BuildSpecHandler{}
	body := []byte(`{"content":"version: 2\njobs:\n  - name: CI\n    steps:\n      - type: command\n        image: alpine\n        commands: echo hi\n"}`)
	req := httptest.NewRequest(http.MethodPost, "/~api/buildspec/validate", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	h.Validate(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d body %s", rec.Code, rec.Body.String())
	}
	var resp validateBuildSpecResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if !resp.Valid {
		t.Fatalf("expected valid, got errors %v", resp.Errors)
	}
}

func TestBuildSpecHandler_Validate_InvalidYAML(t *testing.T) {
	h := &BuildSpecHandler{}
	body := []byte(`{"content":"jobs: [\n"}`)
	req := httptest.NewRequest(http.MethodPost, "/~api/buildspec/validate", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	h.Validate(rec, req)
	var resp validateBuildSpecResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp.Valid {
		t.Fatal("expected invalid")
	}
}
