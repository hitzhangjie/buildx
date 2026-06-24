package api_test

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/server/servertest"
	_ "modernc.org/sqlite"
)

func TestBuildsAPI_queryGetAndDescription(t *testing.T) {
	fix := servertest.Start(t, servertest.Options{
		InitialUser:     "admin",
		InitialPassword: "pass",
		InitialEmail:    "admin@example.com",
	})

	projBody := `{"name":"demo","key":"DEMO"}`
	projReq, _ := http.NewRequest(http.MethodPost, fix.BaseURL+"/~api/projects", strings.NewReader(projBody))
	projReq.SetBasicAuth("admin", "pass")
	projReq.Header.Set("Content-Type", "application/json")
	projResp, err := http.DefaultClient.Do(projReq)
	if err != nil {
		t.Fatal(err)
	}
	defer projResp.Body.Close()
	var project model.Project
	if err := json.NewDecoder(projResp.Body).Decode(&project); err != nil {
		t.Fatal(err)
	}

	db, err := sql.Open("sqlite", filepath.Join(fix.DataDir, "buildx.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	now := time.Now().UTC().Format(time.RFC3339Nano)
	_, err = db.Exec(`
		INSERT INTO o_Build (
			o_project_id, o_numberScope_id, o_number, o_jobName, o_status, o_refName, o_commitHash,
			o_version, o_description, o_submitDate, o_submitReason, o_submitter_id, o_paused, o_uuid
		) VALUES (?, ?, 1, 'CI', 'SUCCESSFUL', 'refs/heads/main', 'abc', '', '', ?, '', 1, 0, 'uuid-1')`,
		project.ID, project.ID, now)
	if err != nil {
		t.Fatal(err)
	}

	var buildID int64
	if err := db.QueryRow(`SELECT o_id FROM o_Build WHERE o_project_id = ?`, project.ID).Scan(&buildID); err != nil {
		t.Fatal(err)
	}

	queryReq, _ := http.NewRequest(http.MethodGet,
		fix.BaseURL+`/~api/builds?query=`+strings.ReplaceAll(`"Project" is "demo"`, " ", "%20"),
		nil)
	queryReq.SetBasicAuth("admin", "pass")
	queryResp, err := http.DefaultClient.Do(queryReq)
	if err != nil {
		t.Fatal(err)
	}
	defer queryResp.Body.Close()
	if queryResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(queryResp.Body)
		t.Fatalf("query builds: %d %s", queryResp.StatusCode, body)
	}
	var builds []model.Build
	if err := json.NewDecoder(queryResp.Body).Decode(&builds); err != nil {
		t.Fatal(err)
	}
	if len(builds) != 1 || builds[0].JobName != "CI" {
		t.Fatalf("builds = %+v", builds)
	}

	getReq, _ := http.NewRequest(http.MethodGet, fix.BaseURL+"/~api/builds/"+strconv.FormatInt(buildID, 10), nil)
	getReq.SetBasicAuth("admin", "pass")
	getResp, err := http.DefaultClient.Do(getReq)
	if err != nil {
		t.Fatal(err)
	}
	defer getResp.Body.Close()
	if getResp.StatusCode != http.StatusOK {
		t.Fatalf("get build: %d", getResp.StatusCode)
	}

	descReq, _ := http.NewRequest(http.MethodPost,
		fix.BaseURL+"/~api/builds/"+strconv.FormatInt(buildID, 10)+"/description",
		bytes.NewReader([]byte("deploy notes")))
	descReq.SetBasicAuth("admin", "pass")
	descResp, err := http.DefaultClient.Do(descReq)
	if err != nil {
		t.Fatal(err)
	}
	defer descResp.Body.Close()
	if descResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(descResp.Body)
		t.Fatalf("set description: %d %s", descResp.StatusCode, body)
	}
}
