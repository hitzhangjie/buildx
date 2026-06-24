package model

import "testing"

func TestPlanarRangeRoundTrip(t *testing.T) {
	r := PlanarRange{FromRow: 202, FromColumn: 1, ToRow: 202, ToColumn: 36, TabWidth: 1}
	if got := r.String(); got != "202.1-202.36-1" {
		t.Fatalf("String() = %q, want %q", got, "202.1-202.36-1")
	}
	if got := r.SourcePosition(); got != "source-202.1-202.36-1" {
		t.Fatalf("SourcePosition() = %q", got)
	}

	parsed, err := ParseSourcePosition("source-202.1-202.36-1")
	if err != nil {
		t.Fatal(err)
	}
	if parsed.FromRow != 202 || parsed.FromColumn != 1 || parsed.ToRow != 202 || parsed.ToColumn != 36 {
		t.Fatalf("parsed range: %+v", parsed)
	}
}

func TestParsePlanarRange_selection(t *testing.T) {
	parsed, err := ParsePlanarRange("3.0-8.12-1")
	if err != nil {
		t.Fatal(err)
	}
	if parsed.FromRow != 3 || parsed.ToRow != 8 {
		t.Fatalf("got %+v", parsed)
	}
}
