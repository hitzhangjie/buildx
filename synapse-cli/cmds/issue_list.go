package cmds

import (
	"fmt"
	"net/url"

	"github.com/spf13/cobra"
)

var issueListCmd = &cobra.Command{
	Use:   "list",
	Short: "Query issues in current (or specified) project",
	RunE: func(cmd *cobra.Command, _ []string) error {
		project, _ := cmd.Flags().GetString("project")
		query, _ := cmd.Flags().GetString("query")
		offset, _ := cmd.Flags().GetInt("offset")
		count, _ := cmd.Flags().GetInt("count")
		currentProject, err := currentProjectFor(runtime, cmd)
		if err != nil {
			return err
		}
		body, err := runtime.API.APIGetBytes("query-issues", url.Values{
			"project":        {project},
			"currentProject": {currentProject},
			"query":          {query},
			"offset":         {fmt.Sprintf("%d", offset)},
			"count":          {fmt.Sprintf("%d", count)},
		})
		if err != nil {
			return err
		}
		emit(body)
		return nil
	},
}

func init() {
	issueListCmd.Flags().String("project", "", "Project path")
	issueListCmd.Flags().String("query", "", "Issue query")
	issueListCmd.Flags().Int("offset", 0, "Offset")
	issueListCmd.Flags().Int("count", defaultQueryCount, fmt.Sprintf("Count (default %d, max %d)", defaultQueryCount, maxQueryCount))
}
