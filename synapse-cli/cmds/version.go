package cmds

import (
	"fmt"

	"github.com/hitzhangjie/buildx/synapse-cli/version"

	"github.com/spf13/cobra"
)

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print CLI version",
	Args:  cobra.NoArgs,
	Run: func(_ *cobra.Command, _ []string) {
		fmt.Println(version.Version)
	},
}
