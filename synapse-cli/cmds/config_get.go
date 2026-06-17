package cmds

import (
	"fmt"
	"os"

	"github.com/hitzhangjie/buildx/synapse-cli/config"

	"github.com/spf13/cobra"
)

var configGetCmd = &cobra.Command{
	Use:   "get [server-url|access-token|trust-certs-file]",
	Short: "Print active configuration (token is redacted)",
	Args: func(_ *cobra.Command, args []string) error {
		if len(args) > 1 {
			return fmt.Errorf("accepts at most 1 argument")
		}
		if len(args) == 1 {
			return config.ValidateConfigPropertyName(args[0])
		}
		return nil
	},
	RunE: func(_ *cobra.Command, args []string) error {
		cfg, err := config.LoadConfig()
		if err != nil {
			return err
		}
		if len(args) == 1 {
			switch args[0] {
			case config.ServerURLKey:
				fmt.Println(cfg.ServerURL)
			case config.AccessTokenKey:
				fmt.Println(config.RedactToken(cfg.AccessToken))
			case config.TrustCertsFileKey:
				fmt.Println(cfg.TrustCertsFile)
			}
			return nil
		}
		path, _ := config.FindConfigFile()
		fmt.Fprintf(os.Stderr, "# config file: %s\n", path)
		fmt.Printf("%s=%s\n", config.ServerURLKey, cfg.ServerURL)
		fmt.Printf("%s=%s\n", config.AccessTokenKey, config.RedactToken(cfg.AccessToken))
		fmt.Printf("%s=%s\n", config.TrustCertsFileKey, cfg.TrustCertsFile)
		return nil
	},
}
