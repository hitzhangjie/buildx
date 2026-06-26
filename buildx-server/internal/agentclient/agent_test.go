package agentclient_test

import (
	"strings"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/agentclient"
)

func TestWebsocketURL(t *testing.T) {
	got := agentclient.WebsocketURLForTest("http://localhost:9910")
	if got != "ws://localhost:9910/~api/agents/ws" {
		t.Fatalf("got %q", got)
	}
	got = agentclient.WebsocketURLForTest("https://buildx.example.com")
	if !strings.HasPrefix(got, "wss://") {
		t.Fatalf("got %q", got)
	}
}
