package git

import (
	"bytes"
	"encoding/hex"
	"fmt"
	"io"
	"log/slog"
	"os/exec"

	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/format/packfile"
	"github.com/go-git/go-git/v5/plumbing/format/pktline"
	"github.com/go-git/go-git/v5/plumbing/object"
	"github.com/go-git/go-git/v5/plumbing/protocol/packp"
	"github.com/go-git/go-git/v5/plumbing/protocol/packp/capability"
	"github.com/go-git/go-git/v5/plumbing/revlist"
	"github.com/go-git/go-git/v5/plumbing/transport"
)

// ---------------------------------------------------------------------------
// Capabilities advertised to clients
// ---------------------------------------------------------------------------

func uploadPackCapabilities() *capability.List {
	caps := capability.NewList()
	caps.Set(capability.MultiACKDetailed)
	caps.Set(capability.NoDone)
	caps.Set(capability.Sideband64k)
	caps.Set(capability.ThinPack)
	caps.Set(capability.OFSDelta)
	caps.Set(capability.Agent, "buildx-server")
	return caps
}

// receivePackCapabilities was removed in favor of native git receive-pack.
// go-git's server-side receive-pack (plumbing/transport/server) has known
// issues with certain push scenarios, particularly tag pushes.
//
// Issues tracked at: https://github.com/go-git/go-git/issues/2203
// Reproduction tests at: ~/test/gogit_push_bug
//
// The native git approach is consistent with OneDev's GitFilter which uses
// "git receive-pack --stateless-rpc" (see references/onedev/.../ReceivePackCommand.java).

// ---------------------------------------------------------------------------
// Smart HTTP: info/refs (reference advertisement)
// ---------------------------------------------------------------------------

// AdvertiseRefs writes a Git smart-HTTP reference advertisement.
// For upload-pack (clone/fetch), go-git is used. For receive-pack (push),
// native git ("git receive-pack --stateless-rpc --advertise-refs") is used
// because go-git's server-side receive-pack has known issues.
//
// See: https://github.com/go-git/go-git/issues/2203
func (r *Repository) AdvertiseRefs(w io.Writer, service string) error {
	switch service {
	case transport.UploadPackServiceName:
		return r.advertiseUploadRefs(w)
	case transport.ReceivePackServiceName:
		return r.advertiseReceiveRefs(w)
	default:
		return fmt.Errorf("unknown git service: %s", service)
	}
}

func (r *Repository) advertiseUploadRefs(w io.Writer) error {
	caps := uploadPackCapabilities()

	ar := packp.NewAdvRefs()
	ar.Capabilities = caps

	refs, err := r.inner.References()
	if err != nil {
		return fmt.Errorf("iterate refs: %w", err)
	}
	defer refs.Close()

	for {
		ref, err := refs.Next()
		if err != nil {
			break
		}
		if err := ar.AddReference(ref); err != nil {
			slog.Debug("skip reference", "ref", ref.Name(), "error", err)
		}
	}

	head, err := r.inner.Head()
	if err == nil && head.Name().IsBranch() {
		headHash := head.Hash()
		ar.Head = &headHash
	}

	return ar.Encode(w)
}

// advertiseReceiveRefs runs "git receive-pack --stateless-rpc --advertise-refs ."
// and pipes its stdout to w. Native git handles capability negotiation correctly.
func (r *Repository) advertiseReceiveRefs(w io.Writer) error {
	cmd := exec.Command("git", "receive-pack", "--stateless-rpc", "--advertise-refs", ".")
	cmd.Dir = r.path
	cmd.Stdout = w

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("git receive-pack --advertise-refs: %w (stderr: %s)", err, stderr.String())
	}
	return nil
}

// ---------------------------------------------------------------------------
// Smart HTTP: upload-pack (clone / fetch)
// ---------------------------------------------------------------------------

// UploadPack handles a git-upload-pack session. It reads the client's
// wants/haves from body and writes the packfile to w.
func (r *Repository) UploadPack(w io.Writer, body io.Reader) error {
	// Parse the upload request manually. UploadRequest.Decode reads wants
	// and shallows but stops at the flush. We then read haves from the
	// remaining data.
	req := packp.NewUploadPackRequest()
	if err := req.Decode(body); err != nil {
		return fmt.Errorf("decode upload request: %w", err)
	}

	// After UploadRequest.Decode, the reader is positioned after the first
	// flush pkt. Read haves from the remaining data.
	scanner := pktline.NewScanner(body)
	var haves []plumbing.Hash
	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			break // flush pkt
		}
		if bytes.Equal(line, []byte("done")) || bytes.Equal(line, []byte("done\n")) {
			continue
		}
		if bytes.HasPrefix(line, []byte("have ")) {
			h := parseHash(line[5 : 5+hashSize])
			haves = append(haves, h)
		}
	}
	req.Haves = haves

	store := r.inner.Storer

	// Compute which objects to send.
	objects, err := revlist.Objects(store, req.Wants, req.Haves)
	if err != nil {
		return fmt.Errorf("revlist: %w", err)
	}

	slog.Debug("upload-pack",
		"wants", len(req.Wants),
		"haves", len(req.Haves),
		"objects", len(objects),
	)

	// Encode packfile into a pipe.
	pr, pw := io.Pipe()
	go func() {
		enc := packfile.NewEncoder(pw, store, false)
		_, encErr := enc.Encode(objects, 10)
		pw.CloseWithError(encErr)
	}()

	// Build response. UploadPackResponse.Encode handles ACK/NAK and
	// copies the packfile from the embedded reader.
	resp := packp.NewUploadPackResponseWithPackfile(req, pr)

	return resp.Encode(w)
}

// ---------------------------------------------------------------------------
// Smart HTTP: receive-pack (push)
// ---------------------------------------------------------------------------

// ReceivePack handles a git-receive-pack session via native git.
// go-git's server-side receive-pack has known bugs with tag pushes,
// so we shell out to "git receive-pack --stateless-rpc" instead.
//
// See: https://github.com/go-git/go-git/issues/2203
// Reproduction tests: ~/test/gogit_push_bug
func (r *Repository) ReceivePack(w io.Writer, body io.Reader) error {
	cmd := exec.Command("git", "receive-pack", "--stateless-rpc", ".")
	cmd.Dir = r.path
	cmd.Stdin = body
	cmd.Stdout = w

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("git receive-pack: %w (stderr: %s)", err, stderr.String())
	}
	return nil
}

// ---------------------------------------------------------------------------
// protocol helpers
// ---------------------------------------------------------------------------

const hashSize = 40 // hex-encoded SHA-1 length

func parseHash(b []byte) plumbing.Hash {
	if len(b) >= hashSize {
		// Validate hex and return.
		if _, err := hex.DecodeString(string(b[:hashSize])); err == nil {
			return plumbing.NewHash(string(b[:hashSize]))
		}
	}
	return plumbing.ZeroHash
}

var _ = object.Commit{} // keep import
