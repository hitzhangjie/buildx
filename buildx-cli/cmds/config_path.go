package cmds

import (
	"fmt"

	"github.com/hitzhangjie/buildx/buildx-cli/config"

	"github.com/spf13/cobra"
)

var configPathCmd = &cobra.Command{
	Use:   "path",
	Short: "Print the path of the cli config file",
	RunE: func(_ *cobra.Command, _ []string) error {
		path, err := config.FindConfigFile()
		if err != nil {
			return err
		}
		fmt.Println(path)
		return nil
	},
}
