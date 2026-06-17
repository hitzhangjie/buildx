package cmds

import (
	"net/url"

	"github.com/spf13/cobra"
)

var buildGetCmd = &cobra.Command{
	Use:   "get <build-reference>",
	Short: "Get detail information of a build",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		currentProject, err := currentProjectFor(runtime, cmd)
		if err != nil {
			return err
		}
		body, err := runtime.API.APIGetBytes("get-build", url.Values{
			"currentProject": {currentProject},
			"reference":      {args[0]},
		})
		if err != nil {
			return err
		}
		emit(body)
		return nil
	},
}
