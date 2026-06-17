package cmds

import (
	"github.com/hitzhangjie/buildx/synapse-cli/client"
	"github.com/hitzhangjie/buildx/synapse-cli/config"

	"github.com/spf13/cobra"
)

var runtime = &Runtime{}

var root = &cobra.Command{
	Use:   "cli",
	Short: "Synapse command-line interface",
	PersistentPreRunE: func(cmd *cobra.Command, _ []string) error {
		if cmd.Name() == "version" || cmd.Name() == "config" {
			return nil
		}
		cfg, err := config.LoadConfig()
		if err != nil {
			return err
		}
		if err := cfg.Validate(); err != nil {
			return err
		}
		runtime.Config = cfg
		runtime.API = client.NewClient(cfg)
		info, err := runtime.API.CheckVersion()
		if err != nil {
			return err
		}
		runtime.VersionInfo = info
		return nil
	},
}

func NewRootCommand() *cobra.Command {
	return root
}

func init() {
	root.AddCommand(configCmd)
	root.AddCommand(projectCmd)
	root.AddCommand(buildCmd)
	root.AddCommand(issueCmd)
	root.AddCommand(prCmd)
	root.AddCommand(crCmd)
	root.AddCommand(versionCmd)
	// misc
	root.AddCommand(getLoginNameCmd)
	root.AddCommand(getUnixTimestampCmd)
	root.AddCommand(remoteCmd)
	root.AddCommand(getValidLabelsCmd)
	root.AddCommand(getCommitMessageRequirementCmd)
	root.AddCommand(downloadCmd)
}
