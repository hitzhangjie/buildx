package persistence_test

import (
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/persistence"
)

func TestDataVersion(t *testing.T) {
	if persistence.DataVersion == "" {
		t.Error("DataVersion should not be empty")
	}
	if persistence.DataVersion != "1.0.0-mvp" {
		t.Errorf("DataVersion = %q", persistence.DataVersion)
	}
}
