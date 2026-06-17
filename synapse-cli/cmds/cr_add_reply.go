package cmds

import (
	"net/url"

	"github.com/spf13/cobra"
)

var crAddReplyCmd = &cobra.Command{
	Use:   "add-reply <comment-id> <content>",
	Short: "Add a reply to a code comment",
	Args:  cobra.ExactArgs(2),
	RunE: func(_ *cobra.Command, args []string) error {
		commentID, err := parseCommentID(args[0])
		if err != nil {
			return err
		}
		body, err := runtime.API.APIPostText("add-code-comment-reply", url.Values{
			"commentId": {commentID},
		}, args[1])
		if err != nil {
			return err
		}
		emit(body)
		return nil
	},
}
