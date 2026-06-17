package cmds

import "github.com/spf13/cobra"

var prCmd = &cobra.Command{
	Use:   "pr",
	Short: "Interact with OneDev pull requests",
}

func init() {
	prCmd.PersistentFlags().String("working-dir", "", "Working directory used to infer project")
	prCmd.AddCommand(prListCmd)
	prCmd.AddCommand(prGetCmd)
}
