package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"strconv"
	"syscall"

	"github.com/hitzhangjie/buildx/buildx-server/internal/config"
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
			if cfg.Dev {
				slog.SetLogLoggerLevel(slog.LevelDebug)
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
			return srv.Run(ctx)
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
