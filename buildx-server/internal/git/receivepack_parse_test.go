package git_test

import (
	"fmt"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
)

func pktLine(data string) []byte {
	return []byte(fmt.Sprintf("%04x%s", 4+len(data), data))
}

func TestParseReceiveUpdates(t *testing.T) {
	old := "1111111111111111111111111111111111111111"
	newHash := "2222222222222222222222222222222222222222"
	cmd := old + " " + newHash + " refs/heads/main\x00report-status"
	body := append(pktLine(cmd), []byte("0000")...)

	updates, err := git.ParseReceiveUpdates(body)
	if err != nil {
		t.Fatal(err)
	}
	if len(updates) != 1 {
		t.Fatalf("got %d updates, want 1", len(updates))
	}
	if updates[0].RefName != "refs/heads/main" {
		t.Fatalf("ref = %q", updates[0].RefName)
	}
	if updates[0].OldHash != old || updates[0].NewHash != newHash {
		t.Fatalf("hashes mismatch: %+v", updates[0])
	}
}

func TestParseReceiveUpdates_flushOnly(t *testing.T) {
	updates, err := git.ParseReceiveUpdates([]byte("0000"))
	if err != nil {
		t.Fatal(err)
	}
	if len(updates) != 0 {
		t.Fatalf("got %d updates", len(updates))
	}
}

func TestShortRefName(t *testing.T) {
	if got := git.ShortRefName("refs/heads/feature/foo"); got != "feature/foo" {
		t.Fatalf("got %q", got)
	}
}
