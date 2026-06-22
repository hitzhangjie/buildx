package client

import (
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"strings"
	"sync"

	"github.com/Masterminds/semver"

	"github.com/hitzhangjie/buildx/buildx-cli/config"
	"github.com/hitzhangjie/buildx/buildx-cli/version"
)

const (
	minRequiredServerVersion = "15.1.0"
	apiPathPrefix            = "/~api/cli/"
)

// VersionInfo is returned by the server's check-version endpoint.
type VersionInfo struct {
	ServerVersion         string `json:"serverVersion"`
	MinRequiredCLIVersion string `json:"minRequiredCliVersion"`
}

// Client talks to the BuildX CLI HTTP API using the supplied configuration.
type Client struct {
	config *config.Config

	httpOnce   sync.Once
	httpClient *http.Client
	httpErr    error
}

func NewClient(cfg *config.Config) *Client {
	return &Client{config: cfg}
}

func readTrustCerts(path string) ([]byte, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read trust-certs-file %q: %w", path, err)
	}
	pool := x509.NewCertPool()
	if !pool.AppendCertsFromPEM(content) {
		return nil, fmt.Errorf("base64 encoded PEM certificate beginning with -----BEGIN CERTIFICATE----- and ending with -----END CERTIFICATE----- is expected: %s", path)
	}
	return content, nil
}

func (c *Client) newHTTPClient() (*http.Client, error) {
	c.httpOnce.Do(func() {
		c.httpClient, c.httpErr = c.buildHTTPClient()
	})
	return c.httpClient, c.httpErr
}

func (c *Client) buildHTTPClient() (*http.Client, error) {
	client := &http.Client{}
	if c.config == nil || c.config.TrustCertsFile == "" {
		return client, nil
	}
	certs, err := readTrustCerts(c.config.TrustCertsFile)
	if err != nil {
		return nil, err
	}
	rootCAs, err := x509.SystemCertPool()
	if err != nil {
		return nil, fmt.Errorf("failed to load system certificate pool: %w", err)
	}
	if rootCAs == nil {
		rootCAs = x509.NewCertPool()
	}
	rootCAs.AppendCertsFromPEM(certs)

	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.TLSClientConfig = &tls.Config{RootCAs: rootCAs}
	client.Transport = transport
	return client, nil
}

func (c *Client) makeAPICall(req *http.Request) ([]byte, error) {
	if c.config == nil {
		return nil, fmt.Errorf("client config is not set")
	}
	req.Header.Set("Authorization", "Bearer "+c.config.AccessToken)
	httpClient, err := c.newHTTPClient()
	if err != nil {
		return nil, err
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request to %s: %w", req.URL.String(), err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("HTTP %d error for endpoint %s: %s", resp.StatusCode, req.URL.String(), string(body))
	}
	if resp.StatusCode == http.StatusNoContent {
		return nil, nil
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response from %s: %w", req.URL.String(), err)
	}
	return body, nil
}

func (c *Client) APIGetBytes(endpointSuffix string, query url.Values) ([]byte, error) {
	apiURL := c.config.ServerURL + apiPathPrefix + endpointSuffix
	if len(query) > 0 {
		apiURL += "?" + query.Encode()
	}
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	return c.makeAPICall(req)
}

func (c *Client) APIPostText(endpointSuffix string, query url.Values, body string) ([]byte, error) {
	apiURL := c.config.ServerURL + apiPathPrefix + endpointSuffix
	if len(query) > 0 {
		apiURL += "?" + query.Encode()
	}
	req, err := http.NewRequest("POST", apiURL, strings.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "text/plain")
	return c.makeAPICall(req)
}

func (c *Client) APIGetAbsolute(absoluteURL string) ([]byte, error) {
	req, err := http.NewRequest("GET", absoluteURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	return c.makeAPICall(req)
}

func (c *Client) ResolveMarkdownResourceURL(resourceURL string) (string, error) {
	parsed, err := url.Parse(resourceURL)
	if err != nil {
		return "", fmt.Errorf("invalid resource URL %q: %w", resourceURL, err)
	}
	if parsed.IsAbs() && (parsed.Scheme == "http" || parsed.Scheme == "https") {
		return resourceURL, nil
	}

	serverURL := c.config.ServerURL
	base, err := url.Parse(strings.TrimRight(serverURL, "/"))
	if err != nil {
		return "", fmt.Errorf("invalid server URL %q: %w", serverURL, err)
	}
	if base.Scheme != "http" && base.Scheme != "https" {
		return "", fmt.Errorf("invalid server URL %q: expected http or https scheme", serverURL)
	}
	return base.ResolveReference(parsed).String(), nil
}

func (c *Client) CheckVersion() (VersionInfo, error) {
	req, err := http.NewRequest("GET", c.config.ServerURL+apiPathPrefix+"check-version", nil)
	if err != nil {
		return VersionInfo{}, fmt.Errorf("failed to check version: %w", err)
	}
	body, err := c.makeAPICall(req)
	if err != nil {
		return VersionInfo{}, err
	}
	var info VersionInfo
	if err := json.Unmarshal(body, &info); err != nil {
		responsePreview := strings.TrimSpace(string(body))
		if len(responsePreview) > 512 {
			responsePreview = responsePreview[:512] + "..."
		}
		return VersionInfo{}, fmt.Errorf("failed to decode version info: %w; response: %q", err, responsePreview)
	}

	cliSemVer, err := semver.NewVersion(version.Version)
	if err != nil {
		return VersionInfo{}, fmt.Errorf("failed to parse cli version %q: %w", version.Version, err)
	}
	if info.MinRequiredCLIVersion != "" {
		minCLISemVer, err := semver.NewVersion(info.MinRequiredCLIVersion)
		if err != nil {
			return VersionInfo{}, fmt.Errorf("failed to parse minimum required cli version %q: %w", info.MinRequiredCLIVersion, err)
		}
		if cliSemVer.LessThan(minCLISemVer) {
			return VersionInfo{}, fmt.Errorf("this server requires cli version >= %s (current: %s)", info.MinRequiredCLIVersion, version.Version)
		}
	}
	if info.ServerVersion != "" {
		serverSemVer, err := semver.NewVersion(info.ServerVersion)
		if err != nil {
			return VersionInfo{}, fmt.Errorf("failed to parse server version %q: %w", info.ServerVersion, err)
		}
		minServerSemVer, err := semver.NewVersion(minRequiredServerVersion)
		if err != nil {
			return VersionInfo{}, fmt.Errorf("failed to parse minimum required server version %q: %w", minRequiredServerVersion, err)
		}
		if serverSemVer.LessThan(minServerSemVer) {
			return VersionInfo{}, fmt.Errorf("this cli requires OneDev server version >= %s (current: %s)", minRequiredServerVersion, info.ServerVersion)
		}
	}
	return info, nil
}

func (c *Client) InferProject(workingDir string) (remote string, project string, err error) {
	if _, err = exec.LookPath("git"); err != nil {
		return "", "", fmt.Errorf("git executable not found in system path")
	}

	prefix := "failed to infer BuildX project from working directory '" + workingDir + "': "
	suffix := ". Working directory is expected to be inside a git repository, with one of the remotes pointing to a BuildX project"

	cmd := exec.Command("git", "rev-parse", "--git-dir")
	cmd.Dir = workingDir
	if _, err := cmd.Output(); err != nil {
		return "", "", fmt.Errorf("%sworking directory is not inside a git repository%s", prefix, suffix)
	}

	body, err := c.APIGetBytes("get-clone-roots", nil)
	if err != nil {
		return "", "", fmt.Errorf("%sfailed to fetch clone roots: %w%s", prefix, err, suffix)
	}
	var cloneRoots map[string]interface{}
	if err := json.Unmarshal(body, &cloneRoots); err != nil {
		return "", "", fmt.Errorf("%sfailed to parse clone roots response: %w%s", prefix, err, suffix)
	}

	httpCloneRoot, _ := cloneRoots["http"].(string)
	sshCloneRoot, _ := cloneRoots["ssh"].(string)

	cmd = exec.Command("git", "remote")
	cmd.Dir = workingDir
	output, err := cmd.Output()
	if err != nil {
		return "", "", fmt.Errorf("%sfailed to list git remotes: %w%s", prefix, err, suffix)
	}
	remotes := strings.Fields(strings.TrimSpace(string(output)))
	if len(remotes) == 0 {
		return "", "", fmt.Errorf("%sno git remotes found in repository%s", prefix, suffix)
	}

	if len(remotes) == 1 {
		remoteName := remotes[0]
		remoteURL, err := gitRemoteURL(workingDir, remoteName)
		if err != nil {
			return "", "", fmt.Errorf("%sfailed to get URL for remote %q: %w%s", prefix, remoteName, err, suffix)
		}
		if remoteURL == "" {
			return "", "", fmt.Errorf("%sremote %q has no URL%s", prefix, remoteName, suffix)
		}
		project, err := extractProjectFromURL(remoteURL)
		if err != nil {
			return "", "", fmt.Errorf("%sfailed to extract project from remote %q: %w%s", prefix, remoteName, err, suffix)
		}
		return remoteName, project, nil
	}

	for _, remoteName := range remotes {
		remoteURL, err := gitRemoteURL(workingDir, remoteName)
		if err != nil || remoteURL == "" {
			continue
		}
		if matchesCloneRoot(remoteURL, httpCloneRoot, sshCloneRoot) {
			project, err := extractProjectFromURL(remoteURL)
			if err != nil {
				return "", "", fmt.Errorf("%sfailed to extract project from remote %q: %w%s", prefix, remoteName, err, suffix)
			}
			return remoteName, project, nil
		}
	}
	return "", "", fmt.Errorf("%sno remote found corresponding to a BuildX project%s", prefix, suffix)
}

func gitRemoteURL(workingDir, remoteName string) (string, error) {
	cmd := exec.Command("git", "remote", "get-url", remoteName)
	cmd.Dir = workingDir
	out, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(out)), nil
}

func matchesCloneRoot(remoteURL, httpCloneRoot, sshCloneRoot string) bool {
	remoteProtocol, remoteHostAndPort, err := parseURLComponents(remoteURL)
	if err != nil || remoteProtocol == "" {
		return false
	}

	httpProtocol, httpHostAndPort, err := parseURLComponents(httpCloneRoot)
	if err == nil && remoteProtocol == httpProtocol && remoteHostAndPort == httpHostAndPort {
		return true
	}
	if sshCloneRoot != "" {
		sshProtocol, sshHostAndPort, err := parseURLComponents(sshCloneRoot)
		if err == nil && remoteProtocol == sshProtocol && remoteHostAndPort == sshHostAndPort {
			return true
		}
	}
	return false
}

func parseURLComponents(rawURL string) (protocol, hostAndPort string, err error) {
	if strings.HasPrefix(rawURL, "http://") || strings.HasPrefix(rawURL, "https://") || strings.HasPrefix(rawURL, "ssh://") {
		protocolIndex := strings.Index(rawURL, "://")
		protocol = rawURL[:protocolIndex+3]
		remaining := rawURL[protocolIndex+3:]
		if atIndex := strings.Index(remaining, "@"); atIndex != -1 {
			remaining = remaining[atIndex+1:]
		}
		if pathIndex := strings.Index(remaining, "/"); pathIndex == -1 {
			hostAndPort = remaining
		} else {
			hostAndPort = remaining[:pathIndex]
		}
	}
	return protocol, hostAndPort, nil
}

func extractProjectFromURL(remoteURL string) (string, error) {
	if !(strings.HasPrefix(remoteURL, "http://") || strings.HasPrefix(remoteURL, "https://") || strings.HasPrefix(remoteURL, "ssh://")) {
		return "", fmt.Errorf("unsupported URL format")
	}
	protocolIndex := strings.Index(remoteURL, "://")
	if protocolIndex == -1 {
		return "", fmt.Errorf("invalid URL format")
	}
	hostPart := remoteURL[protocolIndex+3:]
	pathIndex := strings.Index(hostPart, "/")
	if pathIndex == -1 {
		return "", fmt.Errorf("invalid URL format")
	}
	project := strings.TrimSuffix(hostPart[pathIndex+1:], ".git")
	if project == "" {
		return "", fmt.Errorf("project path is empty in URL")
	}
	return project, nil
}
