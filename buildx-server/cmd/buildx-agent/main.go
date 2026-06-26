package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/hitzhangjie/buildx/buildx-server/internal/agentclient"
)

func main() {
	serverURL := envOr("BUILDX_SERVER_URL", "http://localhost:9910")
	token := os.Getenv("BUILDX_AGENT_TOKEN")
	if token == "" {
		log.Fatal("BUILDX_AGENT_TOKEN is required")
	}
	cfg := agentclient.Config{
		ServerURL: serverURL,
		Token:     token,
		Name:      envOr("BUILDX_AGENT_NAME", hostname()),
		WorkBase:  os.Getenv("BUILDX_AGENT_WORK_DIR"),
	}
	agent := agentclient.New(cfg)
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	log.Printf("buildx-agent connecting to %s as %q", serverURL, cfg.Name)
	if err := agent.Run(ctx); err != nil && ctx.Err() == nil {
		log.Fatal(err)
	}
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func hostname() string {
	h, err := os.Hostname()
	if err != nil {
		return "buildx-agent"
	}
	return h
}
