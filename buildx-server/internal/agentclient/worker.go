// Package agentclient implements the BuildX CI build agent protocol.
package agentclient

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/agent/jobdata"
	"github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"
	"github.com/hitzhangjie/buildx/buildx-server/internal/cache"
	"github.com/hitzhangjie/buildx/buildx-server/internal/execplan"
	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
	"github.com/hitzhangjie/buildx/buildx-server/internal/job"
)

// WorkerClient calls the server worker REST API from a build agent.
type WorkerClient struct {
	BaseURL string
	Token   string
	HTTP    *http.Client
}

func NewWorkerClient(baseURL, token string) *WorkerClient {
	return &WorkerClient{
		BaseURL: strings.TrimRight(baseURL, "/"),
		Token:   token,
		HTTP:    &http.Client{Timeout: 10 * time.Minute},
	}
}

func (w *WorkerClient) Test(ctx context.Context) error {
	u := w.BaseURL + "/~api/worker/test?token=" + url.QueryEscape(w.Token)
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	resp, err := w.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("worker test: %s", resp.Status)
	}
	return nil
}

func (w *WorkerClient) FetchJobData(ctx context.Context, workDir string) (*jobdata.ShellJobData, error) {
	u := w.BaseURL + "/~api/worker/job-data?token=" + url.QueryEscape(w.Token)
	if workDir != "" {
		u += "&workDir=" + url.QueryEscape(workDir)
	}
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	resp, err := w.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("job-data: %s", resp.Status)
	}
	var data jobdata.ShellJobData
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}
	return &data, nil
}

func (w *WorkerClient) RunServerStep(ctx context.Context, position []int) (*executor.ServerStepResult, error) {
	body, _ := json.Marshal(job.RunServerStepRequest{StepPosition: position})
	u := w.BaseURL + "/~api/worker/run-server-step?token=" + url.QueryEscape(w.Token)
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, u, strings.NewReader(string(body)))
	req.Header.Set("Content-Type", "application/json")
	resp, err := w.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("run-server-step: %s: %s", resp.Status, strings.TrimSpace(string(b)))
	}
	var result executor.ServerStepResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (w *WorkerClient) DownloadDependencies(ctx context.Context, dest string) error {
	u := w.BaseURL + "/~api/worker/dependencies?token=" + url.QueryEscape(w.Token)
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	resp, err := w.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("dependencies: %s", resp.Status)
	}
	return untarGz(resp.Body, dest)
}

func (w *WorkerClient) DownloadCache(ctx context.Context, key, checksum, destFile string) (bool, error) {
	u := fmt.Sprintf("%s/~api/worker/job-cache?token=%s&key=%s&checksum=%s",
		w.BaseURL, url.QueryEscape(w.Token), url.QueryEscape(key), url.QueryEscape(checksum))
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	resp, err := w.HTTP.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return false, nil
	}
	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("job-cache download: %s", resp.Status)
	}
	f, err := os.Create(destFile)
	if err != nil {
		return false, err
	}
	defer f.Close()
	_, err = io.Copy(f, resp.Body)
	return true, err
}

func (w *WorkerClient) UploadCache(ctx context.Context, key, checksum string, body io.Reader) error {
	u := fmt.Sprintf("%s/~api/worker/job-cache?token=%s&key=%s&checksum=%s",
		w.BaseURL, url.QueryEscape(w.Token), url.QueryEscape(key), url.QueryEscape(checksum))
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, u, body)
	resp, err := w.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("job-cache upload: %s: %s", resp.Status, strings.TrimSpace(string(b)))
	}
	return nil
}

func untarGz(r io.Reader, dest string) error {
	gr, err := gzip.NewReader(r)
	if err != nil {
		return err
	}
	defer gr.Close()
	tr := tar.NewReader(gr)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}
		target := filepath.Join(dest, hdr.Name)
		switch hdr.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, 0755); err != nil {
				return err
			}
		case tar.TypeReg:
			if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
				return err
			}
			f, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, os.FileMode(hdr.Mode))
			if err != nil {
				return err
			}
			if _, err := io.Copy(f, tr); err != nil {
				f.Close()
				return err
			}
			f.Close()
		}
	}
}

// WorkerServerSteps delegates server-side steps to the worker API.
type WorkerServerSteps struct {
	Worker   *WorkerClient
	Position []int
}

func (h *WorkerServerSteps) RunServerStep(ctx context.Context, step buildspec.Step, jobCtx *executor.JobContext, _ string, logger executor.TaskLogger) (*executor.ServerStepResult, error) {
	_ = step
	if h == nil || h.Worker == nil {
		return nil, fmt.Errorf("worker client not configured")
	}
	pos := h.Position
	if jobCtx != nil && len(jobCtx.CurrentStepPosition) > 0 {
		pos = jobCtx.CurrentStepPosition
	}
	if logger != nil {
		logger.Log("info", "running server step via worker API")
	}
	return h.Worker.RunServerStep(ctx, pos)
}

// WorkerCacheHandler restores/saves cache via worker API.
type WorkerCacheHandler struct {
	Worker *WorkerClient
}

func (h *WorkerCacheHandler) SetupCache(ctx context.Context, jobCtx *executor.JobContext, facade *execplan.SetupCacheFacade, workDir string, logger executor.TaskLogger) error {
	if h == nil || facade == nil {
		return nil
	}
	checksum, err := cache.ChecksumFiles(workDir, facade.ChecksumFiles)
	if err != nil {
		return err
	}
	tmp, err := os.CreateTemp("", "cache-*.tgz")
	if err != nil {
		return err
	}
	tmpPath := tmp.Name()
	tmp.Close()
	defer os.Remove(tmpPath)
	found, err := h.Worker.DownloadCache(ctx, facade.Key, checksum, tmpPath)
	if err != nil {
		return err
	}
	if !found {
		if logger != nil {
			logger.Log("info", "no cache found for key "+facade.Key)
		}
		return nil
	}
	svc := cache.NewService(filepath.Dir(tmpPath))
	return svc.Restore(tmpPath, workDir, facade.Paths)
}

func (h *WorkerCacheHandler) SaveCache(ctx context.Context, jobCtx *executor.JobContext, facade *execplan.SetupCacheFacade, workDir, checksum string) error {
	if h == nil || facade == nil {
		return nil
	}
	svc := cache.NewService(workDir)
	archive, err := svc.Save(jobCtx.ProjectID, facade.Key, checksum, workDir, facade.Paths)
	if err != nil || archive == "" {
		return err
	}
	f, err := os.Open(archive)
	if err != nil {
		return err
	}
	defer f.Close()
	return h.Worker.UploadCache(ctx, facade.Key, checksum, f)
}
