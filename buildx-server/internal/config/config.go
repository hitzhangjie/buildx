package config

import (
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"
)

// Config holds server runtime configuration.
type Config struct {
	// HTTPAddr is the address the HTTP server listens on.
	HTTPAddr string
	// SSHAddr is the address the Git SSH server listens on.
	SSHAddr string
	// DataDir is the root directory for repositories, database, and attachments.
	DataDir string
	// WebDir is an optional directory with built frontend assets (e.g. OneDev web/dist).
	WebDir string
	// Dev enables development mode (verbose logging, hot reload hooks).
	Dev bool
}

// Load reads configuration from environment variables with sensible defaults.
func Load() (*Config, error) {
	cfg := &Config{
		HTTPAddr: envOr("BUILDX_HTTP_ADDR", ":6666"),
		SSHAddr:  envOr("BUILDX_SSH_ADDR", ":6667"),
		DataDir:  envOr("BUILDX_DATA_DIR", "./data"),
		WebDir:   envOr("BUILDX_WEB_DIR", ""),
		Dev:      envBool("BUILDX_DEV", false),
	}
	return cfg, cfg.normalizeAndPrepare()
}

// Revalidate re-normalizes listen addresses and ensures data dir exists after CLI overrides.
func (c *Config) Revalidate() error {
	return c.normalizeAndPrepare()
}

// normalizeAndPrepare validates listen addresses and ensures data dir exists.
func (c *Config) normalizeAndPrepare() error {
	var err error
	if c.HTTPAddr, err = normalizeListenAddr(c.HTTPAddr); err != nil {
		return fmt.Errorf("BUILDX_HTTP_ADDR: %w", err)
	}
	if c.SSHAddr, err = normalizeListenAddr(c.SSHAddr); err != nil {
		return fmt.Errorf("BUILDX_SSH_ADDR: %w", err)
	}
	if err := os.MkdirAll(c.DataDir, 0o750); err != nil {
		return fmt.Errorf("create data dir: %w", err)
	}
	return nil
}

// normalizeListenAddr accepts Go listen forms (:6666, 0.0.0.0:6666) and plain port numbers (6666).
func normalizeListenAddr(addr string) (string, error) {
	addr = strings.TrimSpace(addr)
	if addr == "" {
		return "", fmt.Errorf("listen address is empty")
	}
	if !strings.Contains(addr, ":") {
		port, err := strconv.Atoi(addr)
		if err != nil || port < 1 || port > 65535 {
			return "", fmt.Errorf("invalid listen address %q: use host:port or :port", addr)
		}
		addr = ":" + addr
	}
	if _, err := net.ResolveTCPAddr("tcp", addr); err != nil {
		return "", err
	}
	return addr, nil
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
