package api_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/issuesetting"
	"github.com/hitzhangjie/buildx/buildx-server/internal/server/servertest"
)

func TestIssueSettingsAPI_getAndSave(t *testing.T) {
	fix := servertest.Start(t, servertest.Options{
		InitialUser:     "admin",
		InitialPassword: "pass",
		InitialEmail:    "admin@example.com",
	})

	getReq, _ := http.NewRequest(http.MethodGet, fix.BaseURL+"/~api/settings/issue", nil)
	getResp, err := http.DefaultClient.Do(getReq)
	if err != nil {
		t.Fatal(err)
	}
	defer getResp.Body.Close()
	if getResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(getResp.Body)
		t.Fatalf("get settings: %d %s", getResp.StatusCode, body)
	}
	var setting issuesetting.GlobalIssueSetting
	if err := json.NewDecoder(getResp.Body).Decode(&setting); err != nil {
		t.Fatal(err)
	}
	if len(setting.StateSpecs) != 4 {
		t.Fatalf("default states = %d", len(setting.StateSpecs))
	}

	custom := issuesetting.Default()
	custom.StateSpecs = append(custom.StateSpecs, issuesetting.StateSpec{Name: "Done", Color: "#000"})
	saveBody, _ := json.Marshal(custom)
	saveReq, _ := http.NewRequest(http.MethodPost, fix.BaseURL+"/~api/settings/issue", bytes.NewReader(saveBody))
	saveReq.SetBasicAuth("admin", "pass")
	saveReq.Header.Set("Content-Type", "application/json")
	saveResp, err := http.DefaultClient.Do(saveReq)
	if err != nil {
		t.Fatal(err)
	}
	defer saveResp.Body.Close()
	if saveResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(saveResp.Body)
		t.Fatalf("save settings: %d %s", saveResp.StatusCode, body)
	}

	getReq2, _ := http.NewRequest(http.MethodGet, fix.BaseURL+"/~api/settings/issue", nil)
	getResp2, err := http.DefaultClient.Do(getReq2)
	if err != nil {
		t.Fatal(err)
	}
	defer getResp2.Body.Close()
	if err := json.NewDecoder(getResp2.Body).Decode(&setting); err != nil {
		t.Fatal(err)
	}
	if len(setting.StateSpecs) != 5 {
		t.Fatalf("saved states = %d", len(setting.StateSpecs))
	}
}

func TestIssueSettingsAPI_saveForbiddenForNonRoot(t *testing.T) {
	fix := servertest.Start(t, servertest.Options{
		InitialUser:     "admin",
		InitialPassword: "pass",
		InitialEmail:    "admin@example.com",
	})

	createUserBody := `{"name":"alice","fullName":"Alice","email":"alice@example.com","password":"pass"}`
	createReq, _ := http.NewRequest(http.MethodPost, fix.BaseURL+"/~api/users", bytes.NewReader([]byte(createUserBody)))
	createReq.SetBasicAuth("admin", "pass")
	createReq.Header.Set("Content-Type", "application/json")
	createResp, err := http.DefaultClient.Do(createReq)
	if err != nil {
		t.Fatal(err)
	}
	defer createResp.Body.Close()
	if createResp.StatusCode != http.StatusOK && createResp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(createResp.Body)
		t.Fatalf("create user: %d %s", createResp.StatusCode, body)
	}

	body, _ := json.Marshal(issuesetting.Default())
	req, _ := http.NewRequest(http.MethodPost, fix.BaseURL+"/~api/settings/issue", bytes.NewReader(body))
	req.SetBasicAuth("alice", "pass")
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", resp.StatusCode)
	}
}
