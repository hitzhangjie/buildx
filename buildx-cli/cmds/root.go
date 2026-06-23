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
		if skipsConfigValidation(cmd) {
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

// skipsConfigValidation returns true when cmd or an ancestor is a command that
// manages or reports CLI config (e.g. "config set") and must not require a
// valid config file before running.
func skipsConfigValidation(cmd *cobra.Command) bool {
	for c := cmd; c != nil; c = c.Parent() {
		switch c.Name() {
		case "version", "config":
			return true
		}
	}
	return false
}

func init() {
	root.AddGroup(
		&cobra.Group{ID: "project", Title: "Project:"},
		&cobra.Group{ID: "misc", Title: "Misc:"},
		&cobra.Group{ID: "general", Title: "General:"},
	)
	root.SetHelpCommandGroupID("general")
	root.SetCompletionCommandGroupID("general")

	projectCmd.GroupID = "project"
	issueCmd.GroupID = "project"
	prCmd.GroupID = "project"
	crCmd.GroupID = "project"
	buildCmd.GroupID = "project"

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
