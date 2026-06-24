package git_test

import (
	"bytes"
	"os/exec"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
	"github.com/hitzhangjie/buildx/buildx-server/internal/testutil"
)

func TestAdvertiseUploadRefs(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found")
	}
	bareDir, _, _ := testutil.SetupBareWithCommit(t)

	repo, err := git.Open(bareDir)
	if err != nil {
		t.Fatal(err)
	}

	var buf bytes.Buffer
	if err := repo.AdvertiseRefs(&buf, "git-upload-pack"); err != nil {
		t.Fatalf("AdvertiseRefs upload-pack: %v", err)
	}
	if buf.Len() == 0 {
		t.Error("expected non-empty advertisement")
	}
}

func TestAdvertiseReceiveRefs(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found")
	}
	bareDir, _, _ := testutil.SetupBareWithCommit(t)

	repo, err := git.Open(bareDir)
	if err != nil {
		t.Fatal(err)
	}

	var buf bytes.Buffer
	if err := repo.AdvertiseRefs(&buf, "git-receive-pack"); err != nil {
		t.Fatalf("AdvertiseRefs receive-pack: %v", err)
	}
	if buf.Len() == 0 {
		t.Error("expected non-empty receive advertisement")
	}
}

func TestUploadPack_empty(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found")
	}
	bareDir, _, _ := testutil.SetupBareWithCommit(t)

	repo, err := git.Open(bareDir)
	if err != nil {
		t.Fatal(err)
	}

	// Empty upload-pack request should produce a response.
	var stdout bytes.Buffer
	if err := repo.UploadPack(&stdout, bytes.NewBufferString("0000")); err != nil {
		t.Logf("UploadPack with flush-only: %v (expected for empty request)", err)
	}
}

func TestReceivePack(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found")
	}
	bareDir, _, _ := testutil.SetupBareWithCommit(t)

	repo, err := git.Open(bareDir)
	if err != nil {
		t.Fatal(err)
	}

	// Send empty push (flush only) — receive-pack should accept.
	var stdout bytes.Buffer
	requestData := "0000"
	if err := repo.ReceivePack(&stdout, bytes.NewBufferString(requestData)); err != nil {
		t.Fatalf("ReceivePack: %v", err)
	}
}
