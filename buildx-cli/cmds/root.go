package cmds

import (
	"github.com/hitzhangjie/buildx/buildx-cli/client"
	"github.com/hitzhangjie/buildx/buildx-cli/config"

	"github.com/spf13/cobra"
)

var runtime = &Runtime{}

var root = &cobra.Command{
	Use:   "buildx-cli",
	Short: "BuildX command-line interface",
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
	root.AddGroup(
		&cobra.Group{ID: "resources", Title: "BuildX Resources:"},
		&cobra.Group{ID: "misc", Title: "Misc:"},
		&cobra.Group{ID: "general", Title: "General:"},
	)
	root.SetHelpCommandGroupID("general")
	root.SetCompletionCommandGroupID("general")

	projectCmd.GroupID = "resources"
	issueCmd.GroupID = "resources"
	prCmd.GroupID = "resources"
	crCmd.GroupID = "resources"
	buildCmd.GroupID = "resources"

	getLoginNameCmd.GroupID = "misc"
	getUnixTimestampCmd.GroupID = "misc"
	getValidLabelsCmd.GroupID = "misc"
	getCommitMessageRequirementCmd.GroupID = "misc"
	remoteCmd.GroupID = "misc"
	downloadCmd.GroupID = "misc"

	configCmd.GroupID = "general"
	versionCmd.GroupID = "general"

	root.AddCommand(configCmd)
	root.AddCommand(projectCmd)
	root.AddCommand(buildCmd)
	root.AddCommand(issueCmd)
	root.AddCommand(prCmd)
	root.AddCommand(crCmd)
	root.AddCommand(versionCmd)
	root.AddCommand(getLoginNameCmd)
	root.AddCommand(getUnixTimestampCmd)
	root.AddCommand(remoteCmd)
	root.AddCommand(getValidLabelsCmd)
	root.AddCommand(getCommitMessageRequirementCmd)
	root.AddCommand(downloadCmd)
}
