package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/spf13/cobra"
	"github.com/hitzhangjie/buildx/synapse/internal/config"
	"github.com/hitzhangjie/buildx/synapse/internal/server"
	"github.com/hitzhangjie/buildx/synapse/internal/version"
)

func main() {
	if err := newRootCmd().Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func newRootCmd() *cobra.Command {
	var dev bool

	root := &cobra.Command{
		Use:   "synapse",
		Short: "Synapse — unified DevOps platform",
	}

	serverCmd := &cobra.Command{
		Use:   "server",
		Short: "Start the Synapse server",
		RunE: func(cmd *cobra.Command, _ []string) error {
			if dev {
				_ = os.Setenv("SYNAPSE_DEV", "true")
			}
			cfg, err := config.Load()
			if err != nil {
				return err
			}
			if cfg.Dev {
				slog.SetLogLoggerLevel(slog.LevelDebug)
			}

			ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
			defer stop()

			slog.Info("synapse server", "version", version.Version)
			return server.New(cfg).Run(ctx)
		},
	}
	serverCmd.Flags().BoolVar(&dev, "dev", false, "Enable development mode")

	root.AddCommand(serverCmd, versionCmd())
	return root
}

func versionCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "Print version",
		Run: func(_ *cobra.Command, _ []string) {
			fmt.Println(version.Version)
		},
	}
}
