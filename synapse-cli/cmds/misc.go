package cmds

import (
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"strings"

	client "github.com/hitzhangjie/buildx/synapse-cli/client"

	"github.com/spf13/cobra"
)

var getLoginNameCmd = &cobra.Command{
	Use:   "get-login-name",
	Short: "Get the Synapse login name of the current user (or of --user)",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, _ []string) error {
		userName, _ := cmd.Flags().GetString("user")
		body, err := runtime.API.APIGetBytes("get-login-name", url.Values{"userName": {userName}})
		if err != nil {
			return err
		}
		emit(body)
		return nil
	},
}

var getUnixTimestampCmd = &cobra.Command{
	Use:   "get-unix-timestamp <datetime-description>",
	Short: "Convert a natural-language datetime description to a Unix timestamp (milliseconds)",
	Args:  cobra.ExactArgs(1),
	RunE: func(_ *cobra.Command, args []string) error {
		body, err := runtime.API.APIGetBytes("get-unix-timestamp", url.Values{"dateTimeDescription": {args[0]}})
		if err != nil {
			return err
		}
		emit(body)
		return nil
	},
}

var remoteCmd = &cobra.Command{
	Use:   "remote",
	Short: "Print the git remote that points at the inferred Synapse project",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, _ []string) error {
		remote, _, err := client.InferProject(runtime.Config, workingDirOf(cmd))
		if err != nil {
			return err
		}
		fmt.Println(remote)
		return nil
	},
}

var getValidLabelsCmd = &cobra.Command{
	Use:   "get-valid-labels",
	Short: "Print valid label names for this Synapse server",
	Long: `Print valid label names for this Synapse server. Use this to
discover which label names are accepted by --label when running
'cli pr create'.

The list is fetched from the Synapse server endpoint
/~api/cli/get-valid-labels.`,
	Args: cobra.NoArgs,
	RunE: func(_ *cobra.Command, _ []string) error {
		body, err := runtime.API.APIGetBytes("get-valid-labels", nil)
		if err != nil {
			return err
		}
		emit(body)
		return nil
	},
}

var getCommitMessageRequirementCmd = &cobra.Command{
	Use:   "get-commit-message-requirement [branch]",
	Short: "Print commit message requirement",
	Long: `Print commit message requirement for a branch.
The project is inferred from the current git repository's Synapse project.
Branch defaults to the current git branch when omitted.`,
	Args: cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		project, err := currentProjectFor(runtime, cmd)
		if err != nil {
			return err
		}

		branch := ""
		if len(args) > 0 {
			branch = args[0]
		} else {
			branch, err = currentBranch(workingDirOf(cmd))
			if err != nil {
				return err
			}
			if branch == "" {
				return fmt.Errorf("branch is required: could not detect current branch (detached HEAD)")
			}
		}

		body, err := runtime.API.APIGetBytes("get-commit-message-requirement", url.Values{
			"project": {project},
			"branch":  {branch},
		})
		if err != nil {
			return err
		}
		emit(body)
		return nil
	},
}

var downloadCmd = &cobra.Command{
	Use:   "download <resource-url> <output-file>",
	Short: "Download a resource (image, file, etc.) referenced in markdown",
	Long: `Download a resource referenced in markdown and save it to a local file.

The resource URL must be the original URL from the markdown without modification.
Relative URLs are resolved against the configured server-url. Authentication uses
the configured access-token.`,
	Args: cobra.ExactArgs(2),
	RunE: func(_ *cobra.Command, args []string) error {
		downloadURL, err := client.ResolveMarkdownResourceURL(runtime.Config.ServerURL, args[0])
		if err != nil {
			return err
		}
		body, err := runtime.API.APIGetAbsolute(downloadURL)
		if err != nil {
			return err
		}
		if err := os.WriteFile(args[1], body, 0o644); err != nil {
			return fmt.Errorf("failed to write %s: %v", args[1], err)
		}
		return nil
	},
}

func init() {
	getLoginNameCmd.Flags().String("user", "", "User name (defaults to the current user)")
	remoteCmd.Flags().String("working-dir", "", "Working directory used to infer the Synapse project (defaults to current directory)")
	getCommitMessageRequirementCmd.Flags().String("working-dir", "", "Working directory used to infer the Synapse project (defaults to current directory)")
}

func currentBranch(workingDir string) (string, error) {
	cmd := exec.Command("git", "symbolic-ref", "--short", "HEAD")
	cmd.Dir = workingDir
	out, err := cmd.Output()
	if err != nil {
		return "", nil
	}
	return strings.TrimSpace(string(out)), nil
}
