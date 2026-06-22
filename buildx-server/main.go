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
			return server.New(cfg).Run(ctx)
		},
	}
	serveCmd.Flags().Bool("dev", false, "Enable development mode")

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
