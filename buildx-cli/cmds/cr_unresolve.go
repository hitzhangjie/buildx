package cmds

import (
	"net/url"

	"github.com/spf13/cobra"
)

var crUnresolveCmd = &cobra.Command{
	Use:   "unresolve <comment-id>",
	Short: "Mark a resolved code comment as unresolved",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		commentID, err := parseCommentID(args[0])
		if err != nil {
			return err
		}
		note, _ := cmd.Flags().GetString("note")
		body, err := runtime.API.APIPostText("unresolve-code-comment", url.Values{
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
	crUnresolveCmd.Flags().String("note", "", "Optional note explaining why the comment is unresolved")
}
