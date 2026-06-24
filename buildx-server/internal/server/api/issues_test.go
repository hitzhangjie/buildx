package api_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/server/servertest"
)

func TestIssuesAPI_createQueryAndComment(t *testing.T) {
	fix := servertest.Start(t, servertest.Options{
		InitialUser:     "admin",
		InitialPassword: "pass",
		InitialEmail:    "admin@example.com",
	})

	// Create project
	projBody := `{"name":"demo","key":"DEMO"}`
	projReq, _ := http.NewRequest(http.MethodPost, fix.BaseURL+"/~api/projects", strings.NewReader(projBody))
	projReq.SetBasicAuth("admin", "pass")
	projReq.Header.Set("Content-Type", "application/json")
	projResp, err := http.DefaultClient.Do(projReq)
	if err != nil {
		t.Fatal(err)
	}
	defer projResp.Body.Close()
	if projResp.StatusCode != http.StatusCreated && projResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(projResp.Body)
		t.Fatalf("create project: %d %s", projResp.StatusCode, body)
	}
	var project model.Project
	if err := json.NewDecoder(projResp.Body).Decode(&project); err != nil {
		t.Fatal(err)
	}

	// Create issue
	createBody, _ := json.Marshal(map[string]any{
		"projectId":   project.ID,
		"title":       "Test issue",
		"description": "Body text",
	})
	createReq, _ := http.NewRequest(http.MethodPost, fix.BaseURL+"/~api/issues", bytes.NewReader(createBody))
	createReq.SetBasicAuth("admin", "pass")
	createReq.Header.Set("Content-Type", "application/json")
	createResp, err := http.DefaultClient.Do(createReq)
	if err != nil {
		t.Fatal(err)
	}
	defer createResp.Body.Close()
	if createResp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(createResp.Body)
		t.Fatalf("create issue: %d %s", createResp.StatusCode, body)
	}
	var issueID int64
	if err := json.NewDecoder(createResp.Body).Decode(&issueID); err != nil {
		t.Fatal(err)
	}

	// Query issues
	queryReq, _ := http.NewRequest(http.MethodGet,
		fix.BaseURL+`/~api/issues?query=`+strings.ReplaceAll(`"Project" is "demo"`, " ", "%20"),
		nil)
	queryReq.SetBasicAuth("admin", "pass")
	queryResp, err := http.DefaultClient.Do(queryReq)
	if err != nil {
		t.Fatal(err)
	}
	defer queryResp.Body.Close()
	if queryResp.StatusCode != http.StatusOK {
		t.Fatalf("query issues: %d", queryResp.StatusCode)
	}
	var issues []model.Issue
	if err := json.NewDecoder(queryResp.Body).Decode(&issues); err != nil {
		t.Fatal(err)
	}
	if len(issues) != 1 || issues[0].Number != 1 {
		t.Fatalf("issues = %+v", issues)
	}

	// Add comment
	commentBody, _ := json.Marshal(map[string]any{
		"issue":   map[string]int64{"id": issueID},
		"content": "First comment",
	})
	commentReq, _ := http.NewRequest(http.MethodPost, fix.BaseURL+"/~api/issue-comments", bytes.NewReader(commentBody))
	commentReq.SetBasicAuth("admin", "pass")
	commentReq.Header.Set("Content-Type", "application/json")
	commentResp, err := http.DefaultClient.Do(commentReq)
	if err != nil {
		t.Fatal(err)
	}
	defer commentResp.Body.Close()
	if commentResp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(commentResp.Body)
		t.Fatalf("create comment: %d %s", commentResp.StatusCode, body)
	}

	// List comments
	listReq, _ := http.NewRequest(http.MethodGet, fix.BaseURL+"/~api/issues/"+strconv.FormatInt(issueID, 10)+"/comments", nil)
	listReq.SetBasicAuth("admin", "pass")
	listResp, err := http.DefaultClient.Do(listReq)
	if err != nil {
		t.Fatal(err)
	}
	defer listResp.Body.Close()
	if listResp.StatusCode != http.StatusOK {
		t.Fatalf("list comments: %d", listResp.StatusCode)
	}
	var comments []model.IssueComment
	if err := json.NewDecoder(listResp.Body).Decode(&comments); err != nil {
		t.Fatal(err)
	}
	if len(comments) != 1 || comments[0].Content != "First comment" {
		t.Fatalf("comments = %+v", comments)
	}
}
