package cmds

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"github.com/hitzhangjie/buildx/buildx-cli/config"

	"github.com/spf13/cobra"
)

var configSetCmd = &cobra.Command{
	Use:   "set [server-url|access-token|trust-certs-file] [value]",
	Short: "Create or update the cli config file",
	Args: func(_ *cobra.Command, args []string) error {
		if len(args) == 0 {
			return nil
		}
		if len(args) != 2 {
			return fmt.Errorf("accepts either no arguments or exactly 2 arguments")
		}
		return config.ValidateConfigPropertyName(args[0])
	},
	RunE: func(_ *cobra.Command, args []string) error {
		if len(args) == 2 {
			return config.SetProperty(args[0], args[1])
		}
		return setFullConfig()
	},
}

func setFullConfig() error {
	targetPath, err := config.FindConfigFile()
	if err != nil {
		return err
	}
	existing, err := config.LoadConfig()
	if err != nil {
		return err
	}

	serverURL := existing.ServerURL
	accessToken := existing.AccessToken
	trustCertsFile := existing.TrustCertsFile

	reader := bufio.NewReader(os.Stdin)
	prompt := "Server URL (e.g. https://config.example.com): "
	if serverURL != "" {
		prompt = fmt.Sprintf("Server URL [%s]: ", serverURL)
	}
	value, err := promptValue(reader, prompt)
	if err != nil {
		return err
	}
	if value != "" {
		serverURL = value
	}
	serverURL, err = config.NormalizeConfigProperty(config.ServerURLKey, serverURL)
	if err != nil {
		return err
	}

	if accessToken != "" {
		prompt = "Personal access token (press Enter to keep existing): "
	} else {
		prompt = "Personal access token (input is visible): "
	}
	value, err = promptValue(reader, prompt)
	if err != nil {
		return err
	}
	if value != "" {
		accessToken = value
	}
	accessToken, err = config.NormalizeConfigProperty(config.AccessTokenKey, accessToken)
	if err != nil {
		return err
	}

	if trustCertsFile != "" {
		prompt = fmt.Sprintf("Trust certs file [%s]: ", trustCertsFile)
	} else {
		prompt = "Trust certs file (optional, press Enter to skip): "
	}
	value, err = promptValue(reader, prompt)
	if err != nil {
		return err
	}
	if value != "" {
		trustCertsFile = value
	}
	trustCertsFile, err = config.NormalizeConfigProperty(config.TrustCertsFileKey, trustCertsFile)
	if err != nil {
		return err
	}

	config.RemoveStaleConfigFiles(targetPath)
	return config.WriteConfigFile(targetPath, serverURL, accessToken, trustCertsFile)
}

func promptValue(reader *bufio.Reader, prompt string) (string, error) {
	fmt.Fprint(os.Stderr, prompt)
	line, err := reader.ReadString('\n')
	if err != nil {
		return "", fmt.Errorf("failed to read input: %w", err)
	}
	return strings.TrimSpace(line), nil
}
