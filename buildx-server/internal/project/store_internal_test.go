package project

import (
	"path/filepath"
	"testing"
)

func TestValidateName(t *testing.T) {
	tests := []struct {
		name    string
		wantErr bool
	}{
		{"myproject", false},
		{"MyProject", false},
		{"project-1", false},
		{"project_1", false},
		{"project.1", false},
		{"", true},
		{"robots.txt", true},
		{"Robots.Txt", true},
		{"sitemap.xml", true},
		{"favicon.ico", true},
		{"wicket", true},
		{"projects", true},
		{"has/slash", true},
		{"has\\backslash", true},
		{"中文项目", false},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := validateName(tc.name)
			if tc.wantErr && err == nil {
				t.Fatalf("validateName(%q) expected error", tc.name)
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("validateName(%q): %v", tc.name, err)
			}
		})
	}
}

func TestDeriveKey(t *testing.T) {
	tests := []struct {
		name string
		want string
	}{
		{"MyProject", "MYPROJECT"},
		{"hello", "HELLO"},
		{"HELLO", "HELLO"},
		{"123abc", "P123ABC"},
		{"my-project", "MYPROJECT"},
		{"AbcDef", "ABCDEF"},
		{"A", "A"},
		{"test123Test", "TEST123TEST"},
		{"", "P"},
		{"___", "P"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := deriveKey(tc.name)
			if got != tc.want {
				t.Errorf("deriveKey(%q) = %q, want %q", tc.name, got, tc.want)
			}
		})
	}
}

func TestProjectDir(t *testing.T) {
	s := &DBStore{siteDir: "/data/site"}
	got := s.ProjectDir(42)
	want := filepath.Join("/data/site", "projects", "42")
	if got != want {
		t.Errorf("ProjectDir = %q, want %q", got, want)
	}
}

func TestGitDir(t *testing.T) {
	s := &DBStore{siteDir: "/data/site"}
	got := s.GitDir(42)
	want := filepath.Join("/data/site", "projects", "42", "git")
	if got != want {
		t.Errorf("GitDir = %q, want %q", got, want)
	}
}

func TestProjectKeyPattern(t *testing.T) {
	tests := []struct {
		key     string
		matches bool
	}{
		{"ABC", true},
		{"MYP", true},
		{"P123", true},
		{"A", true},
		{"A1B2C3", true},
		{"abc", false},
		{"123", false},
		{"", false},
		{"A-B", false},
		{"A_B", false},
	}
	for _, tc := range tests {
		t.Run(tc.key, func(t *testing.T) {
			got := projectKeyPattern.MatchString(tc.key)
			if got != tc.matches {
				t.Errorf("projectKeyPattern.MatchString(%q) = %v, want %v", tc.key, got, tc.matches)
			}
		})
	}
}
