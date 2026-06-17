package cmds

import (
	"net/url"

	"github.com/spf13/cobra"
)

var issueGetCmd = &cobra.Command{
	Use:   "get <issue-reference>",
	Short: "Get detail information of an issue",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		currentProject, err := currentProjectFor(runtime, cmd)
		if err != nil {
			return err
		}
		body, err := runtime.API.APIGetBytes("get-issue", url.Values{
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
