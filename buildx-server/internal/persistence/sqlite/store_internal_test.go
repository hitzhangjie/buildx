package sqlite

import (
	"testing"
)

func TestSplitSQL(t *testing.T) {
	tests := []struct {
		name    string
		script  string
		wantLen int
	}{
		{"empty", "", 0},
		{"whitespace", "   \n  ", 0},
		{"single", "SELECT 1", 1},
		{"multiple", "SELECT 1; SELECT 2; SELECT 3", 3},
		{"trailing semicolon", "SELECT 1;", 1},
		{"with comment", "-- comment\nSELECT 1", 1},
		{"only comment", "-- comment\n-- another comment", 0},
		{"mixed comments", "-- header\nSELECT 1;\n-- footer\nSELECT 2", 2},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := splitSQL(tc.script)
			if len(got) != tc.wantLen {
				t.Errorf("splitSQL returned %d statements, want %d: %v", len(got), tc.wantLen, got)
			}
		})
	}
}

func TestStripSQLComments(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{"no comment", "SELECT 1", "SELECT 1"},
		{"line comment", "-- comment\nSELECT 1", "SELECT 1"},
		{"inline comment", "SELECT 1 -- comment", "SELECT 1 -- comment"},
		{"only comment", "-- comment", ""},
		{"empty", "", ""},
		{"multi line no comment", "SELECT\n  1", "SELECT\n  1"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := stripSQLComments(tc.in)
			if got != tc.want {
				t.Errorf("stripSQLComments(%q) = %q, want %q", tc.in, got, tc.want)
			}
		})
	}
}
