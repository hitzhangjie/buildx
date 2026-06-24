package plugin_test

import (
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/plugin"
)

func TestDescriptor(t *testing.T) {
	d := plugin.Descriptor{
		ID:      "com.example.plugin",
		Name:    "example",
		Version: "1.0.0",
	}
	if d.ID != "com.example.plugin" {
		t.Errorf("ID = %q", d.ID)
	}
	if d.Name != "example" {
		t.Errorf("Name = %q", d.Name)
	}
}
