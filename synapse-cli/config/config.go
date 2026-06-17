package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/ini.v1"
)

const (
	ServerURLKey                 = "server-url"
	AccessTokenKey               = "access-token"
	TrustCertsFileKey            = "trust-certs-file"
	ServerURLEnvironmentKey      = "SYNAPSE_SERVER_URL"
	AccessTokenEnvironmentKey    = "SYNAPSE_ACCESS_TOKEN"
	TrustCertsFileEnvironmentKey = "SYNAPSE_TRUST_CERTS_FILE"
)

type Config struct {
	ServerURL      string
	AccessToken    string
	TrustCertsFile string
}

func allConfigFilePaths() []string {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil
	}

	var paths []string
	if xdg := os.Getenv("XDG_CONFIG_HOME"); xdg != "" {
		paths = append(paths, filepath.Join(xdg, "synapse", "config"))
	}
	paths = append(paths, filepath.Join(homeDir, ".config", "synapse", "config"))
	return paths
}

func FindConfigFile() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("failed to get user home directory: %w", err)
	}
	xdg := os.Getenv("XDG_CONFIG_HOME")

	if xdg != "" {
		candidate := filepath.Join(xdg, "synapse", "config")
		if _, err := os.Stat(candidate); err == nil {
			return candidate, nil
		}
	}

	xdgDefault := filepath.Join(homeDir, ".config", "synapse", "config")
	if _, err := os.Stat(xdgDefault); err == nil {
		return xdgDefault, nil
	}
	if xdg != "" {
		return filepath.Join(xdg, "synapse", "config"), nil
	}
	return xdgDefault, nil
}

func LoadConfig() (*Config, error) {
	configFilePath, err := FindConfigFile()
	if err != nil {
		return nil, err
	}
	cfg, err := loadConfigFile(configFilePath)
	if err != nil {
		return nil, err
	}
	applyConfigEnvironmentOverrides(cfg)
	return cfg, nil
}

func loadConfigFile(configFilePath string) (*Config, error) {
	cfg := &Config{}
	if _, err := os.Stat(configFilePath); os.IsNotExist(err) {
		return cfg, nil
	}
	iniCfg, err := ini.Load(configFilePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file %s: %w", configFilePath, err)
	}
	defaultSec := iniCfg.Section("")
	cfg.ServerURL = defaultSec.Key(ServerURLKey).String()
	cfg.AccessToken = defaultSec.Key(AccessTokenKey).String()
	cfg.TrustCertsFile = defaultSec.Key(TrustCertsFileKey).String()
	return cfg, nil
}

func applyConfigEnvironmentOverrides(cfg *Config) {
	if serverURL, ok := os.LookupEnv(ServerURLEnvironmentKey); ok {
		cfg.ServerURL = serverURL
	}
	if accessToken, ok := os.LookupEnv(AccessTokenEnvironmentKey); ok {
		cfg.AccessToken = accessToken
	}
	if trustCertsFile, ok := os.LookupEnv(TrustCertsFileEnvironmentKey); ok {
		cfg.TrustCertsFile = trustCertsFile
	}
}

func (cfg *Config) Validate() error {
	configFilePath, _ := FindConfigFile()
	if cfg.ServerURL == "" {
		return fmt.Errorf("missing setting %q in %s", ServerURLKey, configFilePath)
	}
	if cfg.AccessToken == "" {
		return fmt.Errorf("missing setting %q in %s", AccessTokenKey, configFilePath)
	}
	if !(strings.HasPrefix(cfg.ServerURL, "http://") || strings.HasPrefix(cfg.ServerURL, "https://")) {
		return fmt.Errorf("invalid server url (must start with http:// or https://): %s", cfg.ServerURL)
	}
	cfg.ServerURL = strings.TrimRight(cfg.ServerURL, "/")

	if cfg.TrustCertsFile != "" {
		info, err := os.Stat(cfg.TrustCertsFile)
		if err != nil {
			return fmt.Errorf("invalid trust-certs-file %q: %w", cfg.TrustCertsFile, err)
		}
		if !info.Mode().IsRegular() {
			return fmt.Errorf("invalid trust-certs-file %q: not a regular file", cfg.TrustCertsFile)
		}
	}
	return nil
}

func WriteConfigFile(path, serverURL, accessToken, trustCertsFile string) error {
	if dir := filepath.Dir(path); dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0o700); err != nil {
			return fmt.Errorf("failed to create config directory %s: %w", dir, err)
		}
	}

	contents := fmt.Sprintf("%s=%s\n%s=%s\n", ServerURLKey, serverURL, AccessTokenKey, accessToken)
	if trustCertsFile != "" {
		contents += fmt.Sprintf("%s=%s\n", TrustCertsFileKey, trustCertsFile)
	}
	if err := os.WriteFile(path, []byte(contents), 0o600); err != nil {
		return fmt.Errorf("failed to write config file %s: %w", path, err)
	}
	return nil
}

func ValidateConfigPropertyName(name string) error {
	switch name {
	case ServerURLKey, AccessTokenKey, TrustCertsFileKey:
		return nil
	default:
		return fmt.Errorf("unknown config property %q (expected %q, %q, or %q)", name, ServerURLKey, AccessTokenKey, TrustCertsFileKey)
	}
}

func NormalizeConfigProperty(name, value string) (string, error) {
	normalized := strings.TrimSpace(value)
	if normalized == "" && name != TrustCertsFileKey {
		return "", fmt.Errorf("%s must not be empty", name)
	}
	switch name {
	case ServerURLKey:
		normalized = strings.TrimRight(normalized, "/")
		if !(strings.HasPrefix(normalized, "http://") || strings.HasPrefix(normalized, "https://")) {
			return "", fmt.Errorf("invalid server url (must start with http:// or https://): %s", normalized)
		}
	case TrustCertsFileKey:
		if normalized != "" {
			info, err := os.Stat(normalized)
			if err != nil {
				return "", fmt.Errorf("invalid trust-certs-file %q: %w", normalized, err)
			}
			if !info.Mode().IsRegular() {
				return "", fmt.Errorf("invalid trust-certs-file %q: not a regular file", normalized)
			}
			normalized = filepath.Clean(normalized)
		}
	case AccessTokenKey:
	default:
		return "", ValidateConfigPropertyName(name)
	}
	return normalized, nil
}

func SetProperty(propertyName, propertyValue string) error {
	targetPath, err := FindConfigFile()
	if err != nil {
		return err
	}
	cfg, err := loadConfigFile(targetPath)
	if err != nil {
		return err
	}
	normalizedValue, err := NormalizeConfigProperty(propertyName, propertyValue)
	if err != nil {
		return err
	}

	switch propertyName {
	case ServerURLKey:
		cfg.ServerURL = normalizedValue
	case AccessTokenKey:
		cfg.AccessToken = normalizedValue
	case TrustCertsFileKey:
		cfg.TrustCertsFile = normalizedValue
	default:
		return ValidateConfigPropertyName(propertyName)
	}

	return WriteConfigFile(targetPath, cfg.ServerURL, cfg.AccessToken, cfg.TrustCertsFile)
}

func RemoveStaleConfigFiles(targetPath string) {
	for _, stale := range allConfigFilePaths() {
		if stale == targetPath {
			continue
		}
		if _, err := os.Stat(stale); err == nil {
			_ = os.Remove(stale)
		}
	}
}

func RedactToken(token string) string {
	if token == "" {
		return ""
	}
	if len(token) <= 8 {
		return strings.Repeat("*", len(token))
	}
	return token[:4] + strings.Repeat("*", len(token)-8) + token[len(token)-4:]
}
