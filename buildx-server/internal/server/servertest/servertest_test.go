package servertest_test

import (
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/server/servertest"
)

func TestStart(t *testing.T) {
	fixture := servertest.Start(t, servertest.Options{
		InitialUser:     "admin",
		InitialPassword: "admin123",
		InitialEmail:    "admin@example.com",
	})
	if fixture.BaseURL == "" {
		t.Fatal("expected non-empty BaseURL")
	}
	if fixture.DataDir == "" {
		t.Fatal("expected non-empty DataDir")
	}
}

func TestStart_defaults(t *testing.T) {
	fixture := servertest.Start(t, servertest.Options{})
	if fixture.BaseURL == "" {
		t.Fatal("expected non-empty BaseURL")
	}
}
