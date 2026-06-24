package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"strconv"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/config"
	"github.com/hitzhangjie/buildx/buildx-server/internal/logging"
	"github.com/hitzhangjie/buildx/buildx-server/internal/server"
	"github.com/hitzhangjie/buildx/buildx-server/internal/version"
	"github.com/spf13/cobra"
)

func main() {
	if err := newRootCmd().Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func newRootCmd() *cobra.Command {
	root := &cobra.Command{
		Use:   "buildx-server",
		Short: "BuildX server — unified DevOps platform",
	}

	serveCmd := &cobra.Command{
		Use:   "serve",
		Short: "Start the BuildX server",
		RunE: func(cmd *cobra.Command, _ []string) error {
			cfg, err := config.Load()
			if err != nil {
				return err
			}
			if cmd.Flags().Changed("http-addr") {
				v, err := cmd.Flags().GetString("http-addr")
				if err != nil {
					return err
				}
				cfg.HTTPAddr = v
			}
			if cmd.Flags().Changed("ssh-addr") {
				v, err := cmd.Flags().GetString("ssh-addr")
				if err != nil {
					return err
				}
				cfg.SSHAddr = v
			}
			if cmd.Flags().Changed("data-dir") {
				v, err := cmd.Flags().GetString("data-dir")
				if err != nil {
					return err
				}
				cfg.DataDir = v
			}
			if err := cfg.Revalidate(); err != nil {
				return err
			}
			if v, ok := os.LookupEnv("BUILDX_DEV"); ok {
				cfg.Dev, _ = strconv.ParseBool(v)
			}
			if cmd.Flags().Changed("dev") {
				dev, err := cmd.Flags().GetBool("dev")
				if err != nil {
					return err
				}
				cfg.Dev = dev
			}
			// Configure structured logging.
			// Default: debug when Dev=true, info otherwise. BUILDX_LOG_LEVEL overrides both.
			level := logging.ParseLevel(cfg.LogLevel)
			if cfg.LogLevel == "" && cfg.Dev {
				level = slog.LevelDebug
			}
			logging.Setup(level)

			watch, _ := strconv.ParseBool(os.Getenv("BUILDX_HOTRELOAD"))
			var (
				restartNeeded atomic.Bool
				exePath       string
			)
			if watch {
				var err error
				exePath, err = os.Executable()
				if err != nil {
					return fmt.Errorf("resolve executable: %w", err)
				}
				slog.Info("watching binary for changes", "path", exePath)
			}

			ctx, stop := signal.NotifyContext(context.Background(),
				syscall.SIGINT,
				syscall.SIGQUIT,
				syscall.SIGTERM)
			defer stop()

			slog.Info("buildx server", "version", version.Version)
			slog.Info("configuration",
				"http", cfg.HTTPAddr,
				"ssh", cfg.SSHAddr,
				"data_dir", cfg.DataDir,
				"web_dir", cfg.WebDir,
				"dev", cfg.Dev,
			)
			srv, err := server.New(cfg)
			if err != nil {
				return err
			}
			if watch {
				go watchBinary(exePath, func() {
					restartNeeded.Store(true)
					stop()
				})
			}
			if err := srv.Run(ctx); err != nil {
				return err
			}
			if restartNeeded.Load() {
				slog.Info("restarting with updated binary", "path", exePath)
				return syscall.Exec(exePath, os.Args, os.Environ())
			}
			return nil
		},
	}
	serveCmd.Flags().Bool("dev", false, "Enable development mode")
	serveCmd.Flags().String("http-addr", "", "HTTP listen address (overrides BUILDX_HTTP_ADDR)")
	serveCmd.Flags().String("ssh-addr", "", "SSH listen address (overrides BUILDX_SSH_ADDR)")
	serveCmd.Flags().String("data-dir", "", "Data directory (overrides BUILDX_DATA_DIR)")

	versionCmd := &cobra.Command{
		Use:   "version",
		Short: "Print version",
		Run: func(_ *cobra.Command, _ []string) {
			fmt.Println(version.Version)
		},
	}

	root.AddCommand(serveCmd)
	root.AddCommand(versionCmd)

	return root
}

// watchBinary polls exePath every second and calls onChange when the
// modification time changes (e.g. after a rebuild).
func watchBinary(exePath string, onChange func()) {
	fi, err := os.Stat(exePath)
	if err != nil {
		slog.Warn("watch: cannot stat binary", "path", exePath, "error", err)
		return
	}
	lastMod := fi.ModTime()

	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		fi, err := os.Stat(exePath)
		if err != nil {
			continue
		}
		if fi.ModTime().After(lastMod) {
			slog.Info("binary changed, triggering restart")
			onChange()
			return
		}
		lastMod = fi.ModTime()
	}
}
