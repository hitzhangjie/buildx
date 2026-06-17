package cmds

import "github.com/spf13/cobra"

var projectCmd = &cobra.Command{
	Use:   "project",
	Short: "Interact with OneDev projects",
}

func init() {
	projectCmd.AddCommand(projectCurrentCmd)
	projectCmd.AddCommand(projectGetCmd)
}
