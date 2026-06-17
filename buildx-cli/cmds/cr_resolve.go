package cmds

import (
	"net/url"

	"github.com/spf13/cobra"
)

var crResolveCmd = &cobra.Command{
	Use:   "resolve <comment-id>",
	Short: "Mark an unresolved code comment as resolved",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		commentID, err := parseCommentID(args[0])
		if err != nil {
			return err
		}
		note, _ := cmd.Flags().GetString("note")
		body, err := runtime.API.APIPostText("resolve-code-comment", url.Values{
			"commentId": {commentID},
		}, note)
		if err != nil {
			return err
		}
		emit(body)
		return nil
	},
}

func init() {
	crResolveCmd.Flags().String("note", "", "Optional note explaining the resolution")
}
