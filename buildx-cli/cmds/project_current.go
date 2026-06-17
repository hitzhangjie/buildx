package cmds

import (
	"fmt"

	"github.com/spf13/cobra"
)

var projectCurrentCmd = &cobra.Command{
	Use:   "current",
	Short: "Print the project inferred from working directory",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, _ []string) error {
		project, err := currentProjectFor(runtime, cmd)
		if err != nil {
			return err
		}
		fmt.Println(project)
		return nil
	},
}

func init() {
	projectCurrentCmd.Flags().String("working-dir", "", "Working directory used to infer project")
}
