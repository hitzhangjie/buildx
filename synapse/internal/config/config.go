package config

import (
	"fmt"
	"os"
	"strconv"
)

// Config holds server runtime configuration.
type Config struct {
	// HTTPAddr is the address the HTTP server listens on.
	HTTPAddr string
	// SSHAddr is the address the Git SSH server listens on.
	SSHAddr string
	// DataDir is the root directory for repositories, database, and attachments.
	DataDir string
	// Dev enables development mode (verbose logging, hot reload hooks).
	Dev bool
}

// Load reads configuration from environment variables with sensible defaults.
func Load() (*Config, error) {
	cfg := &Config{
		HTTPAddr: envOr("SYNAPSE_HTTP_ADDR", ":6610"),
		SSHAddr:  envOr("SYNAPSE_SSH_ADDR", ":6611"),
		DataDir:  envOr("SYNAPSE_DATA_DIR", "./data"),
		Dev:      envBool("SYNAPSE_DEV", false),
	}
	if err := os.MkdirAll(cfg.DataDir, 0o750); err != nil {
		return nil, fmt.Errorf("create data dir: %w", err)
	}
	return cfg, nil
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return b
}
