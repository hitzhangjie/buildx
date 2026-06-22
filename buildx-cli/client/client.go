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
}

func NewClient(cfg *config.Config) *Client {
	return &Client{config: cfg}
}

func (c *Client) newHTTPClient() (*http.Client, error) {
	client := &http.Client{}
	if c.config == nil || c.config.TrustCertsFile == "" {
		return client, nil
	}
	content, err := os.ReadFile(c.config.TrustCertsFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read trust-certs-file %q: %w", c.config.TrustCertsFile, err)
	}
	pool := x509.NewCertPool()
	if !pool.AppendCertsFromPEM(content) {
		return nil, fmt.Errorf("invalid trust-certs-file: %s", c.config.TrustCertsFile)
	}
	rootCAs, err := x509.SystemCertPool()
	if err != nil {
		return nil, fmt.Errorf("failed to load system certificate pool: %w", err)
	}
	if rootCAs == nil {
		rootCAs = x509.NewCertPool()
	}
	rootCAs.AppendCertsFromPEM(content)

	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.TLSClientConfig = &tls.Config{RootCAs: rootCAs}
	client.Transport = transport
	return client, nil
}

func (c *Client) makeAPICall(req *http.Request) ([]byte, error) {
	req.Header.Set("Authorization", "Bearer "+c.config.AccessToken)
	httpClient, err := c.newHTTPClient()
	if err != nil {
		return nil, err
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request to %s: %v", req.URL.String(), err)
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
		return nil, fmt.Errorf("failed to read response from %s: %v", req.URL.String(), err)
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
		return nil, fmt.Errorf("failed to create request: %v", err)
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
		return nil, fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Content-Type", "text/plain")
	return c.makeAPICall(req)
}

func (c *Client) APIGetAbsolute(absoluteURL string) ([]byte, error) {
	req, err := http.NewRequest("GET", absoluteURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}
	return c.makeAPICall(req)
}

func (c *Client) ResolveMarkdownResourceURL(resourceURL string) (string, error) {
	parsed, err := url.Parse(resourceURL)
	if err != nil {
		return "", fmt.Errorf("invalid resource URL %q: %v", resourceURL, err)
	}
	if parsed.IsAbs() && (parsed.Scheme == "http" || parsed.Scheme == "https") {
		return resourceURL, nil
	}

	serverURL := c.config.ServerURL
	base, err := url.Parse(strings.TrimRight(serverURL, "/"))
	if err != nil {
		return "", fmt.Errorf("invalid server URL %q: %v", serverURL, err)
	}
	if base.Scheme != "http" && base.Scheme != "https" {
		return "", fmt.Errorf("invalid server URL %q: expected http or https scheme", serverURL)
	}
	return base.ResolveReference(parsed).String(), nil
}

func (c *Client) CheckVersion() (VersionInfo, error) {
	req, err := http.NewRequest("GET", c.config.ServerURL+apiPathPrefix+"check-version", nil)
	if err != nil {
		return VersionInfo{}, fmt.Errorf("failed to check version: %v", err)
	}
	body, err := c.makeAPICall(req)
	if err != nil {
		return VersionInfo{}, err
	}
	var info VersionInfo
	if err := json.Unmarshal(body, &info); err != nil {
		return VersionInfo{}, fmt.Errorf("failed to decode version info: %w", err)
	}

	cliSemVer, err := semver.NewVersion(version.Version)
	if err != nil {
		return VersionInfo{}, fmt.Errorf("failed to parse cli version %q: %v", version.Version, err)
	}
	if info.MinRequiredCLIVersion != "" {
		minCLISemVer, err := semver.NewVersion(info.MinRequiredCLIVersion)
		if err == nil && cliSemVer.LessThan(minCLISemVer) {
			return VersionInfo{}, fmt.Errorf("this server requires cli version >= %s (current: %s)", info.MinRequiredCLIVersion, version.Version)
		}
	}
	if info.ServerVersion != "" {
		serverSemVer, err := semver.NewVersion(info.ServerVersion)
		if err == nil {
			minServerSemVer, _ := semver.NewVersion(minRequiredServerVersion)
			if serverSemVer.LessThan(minServerSemVer) {
				return VersionInfo{}, fmt.Errorf("this cli requires OneDev server version >= %s (current: %s)", minRequiredServerVersion, info.ServerVersion)
			}
		}
	}
	return info, nil
}

func (c *Client) InferProject(workingDir string) (remote string, project string, err error) {
	_, err = exec.LookPath("git")
	if err != nil {
		return "", "", fmt.Errorf("git executable not found in system path")
	}

	cmd := exec.Command("git", "rev-parse", "--git-dir")
	cmd.Dir = workingDir
	if _, err := cmd.Output(); err != nil {
		return "", "", fmt.Errorf("working directory is not inside a git repository")
	}

	body, err := c.APIGetBytes("get-clone-roots", nil)
	if err != nil {
		return "", "", err
	}
	var cloneRoots map[string]interface{}
	if err := json.Unmarshal(body, &cloneRoots); err != nil {
		return "", "", fmt.Errorf("failed to parse clone roots response: %v", err)
	}

	httpCloneRoot, _ := cloneRoots["http"].(string)
	sshCloneRoot, _ := cloneRoots["ssh"].(string)

	cmd = exec.Command("git", "remote")
	cmd.Dir = workingDir
	output, err := cmd.Output()
	if err != nil {
		return "", "", fmt.Errorf("failed to list git remotes: %v", err)
	}
	remotes := strings.Fields(strings.TrimSpace(string(output)))
	for _, remoteName := range remotes {
		cmd = exec.Command("git", "remote", "get-url", remoteName)
		cmd.Dir = workingDir
		out, err := cmd.Output()
		if err != nil {
			continue
		}
		remoteURL := strings.TrimSpace(string(out))
		if matchesCloneRoot(remoteURL, httpCloneRoot, sshCloneRoot) {
			project, err := extractProjectFromURL(remoteURL)
			if err != nil {
				return "", "", err
			}
			return remoteName, project, nil
		}
	}
	return "", "", fmt.Errorf("no remote found corresponding to an OneDev project")
}

func matchesCloneRoot(remoteURL, httpCloneRoot, sshCloneRoot string) bool {
	remoteProtocol, remoteHostAndPort, _ := parseURLComponents(remoteURL)
	httpProtocol, httpHostAndPort, _ := parseURLComponents(httpCloneRoot)
	if remoteProtocol == httpProtocol && remoteHostAndPort == httpHostAndPort {
		return true
	}
	if sshCloneRoot != "" {
		sshProtocol, sshHostAndPort, _ := parseURLComponents(sshCloneRoot)
		if remoteProtocol == sshProtocol && remoteHostAndPort == sshHostAndPort {
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
