package cmds

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/hitzhangjie/buildx/buildx-cli/client"
	"github.com/hitzhangjie/buildx/buildx-cli/config"

	"github.com/spf13/cobra"
)

type Runtime struct {
	Config      *config.Config
	API         *client.Client
	VersionInfo client.VersionInfo
}

func workingDirOf(cmd *cobra.Command) string {
	if wd, err := cmd.Flags().GetString("working-dir"); err == nil && wd != "" {
		return wd
	}
	return "."
}

func currentProjectFor(rt *Runtime, cmd *cobra.Command) (string, error) {
	_, project, err := rt.API.InferProject(workingDirOf(cmd))
	if err != nil {
		return "", err
	}
	return project, nil
}

func emit(body []byte) {
	if len(body) == 0 {
		return
	}
	_, _ = os.Stdout.Write(body)
	if body[len(body)-1] != '\n' {
		fmt.Println()
	}
}

func parseCommentID(value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", fmt.Errorf("comment-id cannot be empty")
	}
	id, err := strconv.ParseInt(value, 10, 64)
	if err != nil || id <= 0 {
		return "", fmt.Errorf("invalid comment-id %q: must be a positive integer", value)
	}
	return value, nil
}
