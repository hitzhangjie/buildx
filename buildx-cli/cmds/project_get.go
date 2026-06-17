package cmds

import (
	"net/url"

	"github.com/spf13/cobra"
)

var projectGetCmd = &cobra.Command{
	Use:   "get <project-path>",
	Short: "Print info of the specified project",
	Args:  cobra.ExactArgs(1),
	RunE: func(_ *cobra.Command, args []string) error {
		body, err := runtime.API.APIGetBytes("get-project", url.Values{"project": {args[0]}})
		if err != nil {
			return err
		}
		emit(body)
		return nil
	},
}
