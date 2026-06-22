package cmds

import "github.com/spf13/cobra"

var crCmd = &cobra.Command{
	Use:     "cr",
	Aliases: []string{"codereview"},
	Short:   "Interact with OneDev code reviews (code comments)",
}

func init() {
	crCmd.AddCommand(crAddReplyCmd)
	crCmd.AddCommand(crResolveCmd)
	crCmd.AddCommand(crUnresolveCmd)
}
