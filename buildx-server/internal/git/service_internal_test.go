package git

import (
	"testing"
	"time"

	gogit "github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/object"
)

func TestFirstLine(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{"", ""},
		{"single line", "single line"},
		{"first\nsecond", "first"},
		{"first\nsecond\nthird", "first"},
		{"\nleading newline", ""},
	}
	for _, tc := range tests {
		got := firstLine(tc.in)
		if got != tc.want {
			t.Errorf("firstLine(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestSplitCommitMessage(t *testing.T) {
	tests := []struct {
		message      string
		wantSubject  string
		wantBody     string
	}{
		{"", "", ""},
		{"subject only", "subject only", ""},
		{"subject\n\nbody", "subject", "body"},
		{"subject\nbody", "subject", "body"},
		{"subject\n\nmulti\nline\nbody", "subject", "multi\nline\nbody"},
	}
	for _, tc := range tests {
		subj, body := splitCommitMessage(tc.message)
		if subj != tc.wantSubject {
			t.Errorf("splitCommitMessage(%q) subject = %q, want %q", tc.message, subj, tc.wantSubject)
		}
		if body != tc.wantBody {
			t.Errorf("splitCommitMessage(%q) body = %q, want %q", tc.message, body, tc.wantBody)
		}
	}
}

func TestHumanizeTime(t *testing.T) {
	now := time.Now()
	tests := []struct {
		name   string
		when   time.Time
		hasStr string
	}{
		{"seconds", now.Add(-30 * time.Second), "seconds ago"},
		{"minutes", now.Add(-5 * time.Minute), "minutes ago"},
		{"hours", now.Add(-3 * time.Hour), "hours ago"},
		{"days", now.Add(-5 * 24 * time.Hour), "days ago"},
		{"months", now.Add(-60 * 24 * time.Hour), "months ago"},
		{"years", now.Add(-400 * 24 * time.Hour), "year"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := humanizeTime(tc.when)
			if len(got) == 0 {
				t.Error("humanizeTime returned empty string")
			}
			if !containsStr(got, tc.hasStr) {
				t.Errorf("humanizeTime = %q, expected to contain %q", got, tc.hasStr)
			}
		})
	}
}

func TestPersonFromSignature(t *testing.T) {
	tz, _ := time.LoadLocation("Asia/Shanghai")
	sig := object.Signature{
		Name:  "Alice",
		Email: "alice@example.com",
		When:  time.Date(2025, 1, 15, 10, 30, 0, 0, tz),
	}
	p := personFromSignature(sig)
	if p.Name != "Alice" {
		t.Errorf("Name = %q, want Alice", p.Name)
	}
	if p.EmailAddress != "alice@example.com" {
		t.Errorf("EmailAddress = %q", p.EmailAddress)
	}
	if p.When == 0 {
		t.Error("When should not be zero")
	}
}

func TestCommitFromObject(t *testing.T) {
	// Create a minimal commit via go-git plumbing.
	hash := plumbing.ComputeHash(plumbing.CommitObject, []byte("test"))
	parentHash := plumbing.ComputeHash(plumbing.CommitObject, []byte("parent"))
	obj := &object.Commit{
		Hash:    hash,
		Message: "subject line\n\nbody text",
		Author: object.Signature{
			Name:  "Bob",
			Email: "bob@example.com",
			When:  time.Now(),
		},
		Committer: object.Signature{
			Name:  "Bob",
			Email: "bob@example.com",
			When:  time.Now(),
		},
		ParentHashes: []plumbing.Hash{parentHash},
	}

	c := commitFromObject(obj)
	if c.Hash != hash.String() {
		t.Errorf("Hash = %q, want %q", c.Hash, hash.String())
	}
	if c.Subject != "subject line" {
		t.Errorf("Subject = %q, want %q", c.Subject, "subject line")
	}
	if c.Body != "body text" {
		t.Errorf("Body = %q, want %q", c.Body, "body text")
	}
	if len(c.ParentHashes) != 1 || c.ParentHashes[0] != parentHash.String() {
		t.Error("ParentHashes mismatch")
	}
	if c.Author.Name != "Bob" {
		t.Error("Author name mismatch")
	}
}

func containsStr(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// Ensure go-git import is used (for commitFromObject test scaffolding).
var _ = gogit.Clone
