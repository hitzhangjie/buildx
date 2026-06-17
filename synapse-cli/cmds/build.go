package cmds

import "github.com/spf13/cobra"

var buildCmd = &cobra.Command{
	Use:   "build",
	Short: "Interact with OneDev builds",
}

func init() {
	buildCmd.PersistentFlags().String("working-dir", "", "Working directory used to infer project")
	buildCmd.AddCommand(buildListCmd)
	buildCmd.AddCommand(buildGetCmd)
}
