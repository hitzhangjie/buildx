package cmds

import "github.com/spf13/cobra"

var issueCmd = &cobra.Command{
	Use:   "issue",
	Short: "Interact with issues",
}

func init() {
	issueCmd.PersistentFlags().String("working-dir", "", "Working directory used to infer project")
	issueCmd.AddCommand(issueListCmd)
	issueCmd.AddCommand(issueGetCmd)
}
