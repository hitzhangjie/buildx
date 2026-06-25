package job

import (
	"context"
	"fmt"
	"path/filepath"
	"testing"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/build"
	"github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"
	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

type memBuildStore struct {
	builds map[int64]*model.Build
	nextID int64
}

func newMemBuildStore() *memBuildStore {
	return &memBuildStore{builds: make(map[int64]*model.Build), nextID: 1}
}

func (m *memBuildStore) Create(_ context.Context, b *model.Build) (*model.Build, error) {
	cp := *b
	cp.ID = m.nextID
	m.nextID++
	m.builds[cp.ID] = &cp
	return m.builds[cp.ID], nil
}

func (m *memBuildStore) Get(_ context.Context, id int64) (*model.Build, error) {
	b, ok := m.builds[id]
	if !ok {
		return nil, ErrNotFound
	}
	return b, nil
}

func (m *memBuildStore) GetByNumber(_ context.Context, projectID int64, number int) (*model.Build, error) {
	for _, b := range m.builds {
		if b.ProjectID == projectID && b.Number == number {
			return b, nil
		}
	}
	return nil, ErrNotFound
}

func (m *memBuildStore) Query(_ context.Context, filter build.QueryFilter, _, _ int) ([]*model.Build, error) {
	status := filter.Status
	var out []*model.Build
	for _, b := range m.builds {
		if status != "" && string(b.Status) != status {
			continue
		}
		out = append(out, b)
	}
	return out, nil
}

func (m *memBuildStore) Delete(_ context.Context, id int64) error {
	delete(m.builds, id)
	return nil
}

func (m *memBuildStore) UpdateStatus(_ context.Context, id int64, status model.BuildStatus) error {
	if b := m.builds[id]; b != nil {
		b.Status = status
	}
	return nil
}

func (m *memBuildStore) UpdateVersion(_ context.Context, id int64, version string) error {
	if b := m.builds[id]; b != nil {
		b.Version = version
	}
	return nil
}

func (m *memBuildStore) ResetForResubmit(_ context.Context, id int64, token, reason string, submitterID int64) error {
	b := m.builds[id]
	if b == nil {
		return ErrNotFound
	}
	b.Status = model.BuildStatusWaiting
	b.Token = token
	b.SubmitReason = reason
	b.SubmitSequence++
	return nil
}

func (m *memBuildStore) UpdateRetryPending(_ context.Context, id int64) error {
	if b := m.builds[id]; b != nil {
		b.Status = model.BuildStatusPending
	}
	return nil
}

func (m *memBuildStore) UpdateDates(_ context.Context, id int64, _, _, _ *time.Time) error {
	return nil
}

func (m *memBuildStore) CreateDependence(_ context.Context, _ *model.BuildDependence) error {
	return nil
}

func (m *memBuildStore) ListDependencies(_ context.Context, _ int64) ([]*model.BuildDependence, error) {
	return nil, nil
}

func (m *memBuildStore) ListDependents(_ context.Context, _ int64) ([]*model.BuildDependence, error) {
	return nil, nil
}

type stubProjects struct {
	dir string
}

func (s *stubProjects) Get(_ context.Context, id int64) (*model.Project, error) {
	return &model.Project{ID: id}, nil
}

func (s *stubProjects) GetByPath(_ context.Context, _ string) (*model.Project, error) {
	return nil, ErrNotFound
}

func (s *stubProjects) GitDir(projectID int64) string {
	return filepath.Join(s.dir, "git", fmt.Sprintf("%d", projectID))
}

func (s *stubProjects) ProjectDir(projectID int64) string {
	return filepath.Join(s.dir, "projects", fmt.Sprintf("%d", projectID))
}

type stubGit struct {
	files map[string][]byte
}

func (g *stubGit) ReadFileAtCommit(_ context.Context, _, commit, path string) ([]byte, error) {
	return g.files[commit+":"+path], nil
}

func (g *stubGit) ResolveRef(_ context.Context, _, ref string) (string, error) {
	return ref, nil
}

func TestRunBuild_CommandAndTemplate(t *testing.T) {
	tmp := t.TempDir()
	workBase := filepath.Join(tmp, "builds")
	registry := executor.NewRegistry()
	registry.Register(executor.NewServerShellExecutor(workBase), nil)

	specYAML := []byte(`
jobs:
- name: ci
  steps:
  - type: command
    name: hello
    commands: echo hello
  - type: use-template
    name: tmpl
    templateName: greet
stepTemplates:
- name: greet
  steps:
  - type: command
    name: greet-cmd
    commands: echo greet
`)

	git := &stubGit{
		files: map[string][]byte{
			"abc:" + buildspec.BuildSpecBLOBPath: specYAML,
		},
	}

	store := newMemBuildStore()
	svc := NewService(store, nil, registry, &stubProjects{dir: tmp}, git, nil)

	build := &model.Build{
		ID:         1,
		ProjectID:  10,
		Number:     1,
		JobName:    "ci",
		Status:     model.BuildStatusPending,
		CommitHash: "abc",
		RefName:    "refs/heads/main",
		Token:      "tok-1",
		Submitter:  &model.User{ID: 1},
	}
	store.builds[1] = build

	jobDef := &buildspec.Job{Name: "ci"}

	svc.runBuild(t.Context(), build, jobDef)

	final, err := store.Get(t.Context(), 1)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if final.Status != model.BuildStatusSuccessful {
		t.Fatalf("status = %s, want SUCCESSFUL", final.Status)
	}
}

func TestScheduler_PicksPendingBuild(t *testing.T) {
	tmp := t.TempDir()
	workBase := filepath.Join(tmp, "builds")
	registry := executor.NewRegistry()
	registry.Register(executor.NewServerShellExecutor(workBase), nil)

	specYAML := []byte(`
jobs:
- name: ci
  steps:
  - type: command
    name: hello
    commands: echo scheduled
`)

	git := &stubGit{
		files: map[string][]byte{
			"abc:" + buildspec.BuildSpecBLOBPath: specYAML,
		},
	}

	store := newMemBuildStore()
	svc := NewService(store, nil, registry, &stubProjects{dir: tmp}, git, nil)

	build := &model.Build{
		ID:         2,
		ProjectID:  10,
		Number:     2,
		JobName:    "ci",
		Status:     model.BuildStatusPending,
		CommitHash: "abc",
		RefName:    "refs/heads/main",
		Token:      "tok-2",
		Submitter:  &model.User{ID: 1},
	}
	store.builds[2] = build

	ctx, cancel := context.WithCancel(t.Context())
	defer cancel()
	svc.StartScheduler(ctx)
	svc.tryScheduleBuild(ctx, 2)

	deadline := time.Now().Add(10 * time.Second)
	for time.Now().Before(deadline) {
		final, _ := store.Get(ctx, 2)
		if final.Status == model.BuildStatusSuccessful {
			return
		}
		time.Sleep(50 * time.Millisecond)
	}
	t.Fatal("build did not complete via scheduler")
}
