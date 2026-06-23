package git

import (
	"bytes"
	"context"
	"encoding/hex"
	"fmt"
	"io"
	"log/slog"

	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/format/packfile"
	"github.com/go-git/go-git/v5/plumbing/format/pktline"
	"github.com/go-git/go-git/v5/plumbing/object"
	"github.com/go-git/go-git/v5/plumbing/protocol/packp"
	"github.com/go-git/go-git/v5/plumbing/protocol/packp/capability"
	"github.com/go-git/go-git/v5/plumbing/revlist"
	"github.com/go-git/go-git/v5/plumbing/storer"
	"github.com/go-git/go-git/v5/plumbing/transport"
	"github.com/go-git/go-git/v5/plumbing/transport/server"
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

func receivePackCapabilities() *capability.List {
	// go-git server receive-pack (plumbing/transport/server) does not support
	// side-band-64k or atomic; advertising them causes native git push to fail
	// with "unsupported capability: side-band-64k".
	// https://github.com/go-git/go-git/issues/2203
	caps := capability.NewList()
	caps.Set(capability.ReportStatus)
	caps.Set(capability.DeleteRefs)
	caps.Set(capability.OFSDelta)
	caps.Set(capability.Agent, "buildx-server")
	return caps
}

// ---------------------------------------------------------------------------
// Smart HTTP: info/refs (reference advertisement)
// ---------------------------------------------------------------------------

// AdvertiseRefs writes a Git smart-HTTP reference advertisement for the
// given service ("git-upload-pack" or "git-receive-pack") to w.
func (r *Repository) AdvertiseRefs(w io.Writer, service string) error {
	var caps *capability.List
	switch service {
	case transport.UploadPackServiceName:
		caps = uploadPackCapabilities()
	case transport.ReceivePackServiceName:
		caps = receivePackCapabilities()
	default:
		return fmt.Errorf("unknown git service: %s", service)
	}

	ar := packp.NewAdvRefs()
	ar.Capabilities = caps

	// Collect refs.
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
			slog.Warn("skip reference", "ref", ref.Name(), "error", err)
		}
	}

	// Set HEAD if it exists.
	head, err := r.inner.Head()
	if err == nil && head.Name().IsBranch() {
		headHash := head.Hash()
		ar.Head = &headHash
	}

	return ar.Encode(w)
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

// ReceivePack handles a git-receive-pack session via go-git.
// See receivePackCapabilities for capability limitations and protocol_test.go.
func (r *Repository) ReceivePack(w io.Writer, body io.Reader) error {
	req := packp.NewReferenceUpdateRequest()
	if err := req.Decode(body); err != nil {
		return fmt.Errorf("decode receive-pack request: %w", err)
	}

	srv := server.NewServer(storerLoader{s: r.inner.Storer})
	sess, err := srv.NewReceivePackSession(&transport.Endpoint{}, nil)
	if err != nil {
		return fmt.Errorf("new receive-pack session: %w", err)
	}
	defer sess.Close()

	rs, err := sess.ReceivePack(context.Background(), req)
	if rs != nil {
		if encErr := rs.Encode(w); encErr != nil {
			return fmt.Errorf("encode report status: %w", encErr)
		}
	}
	if err != nil {
		return fmt.Errorf("receive pack: %w", err)
	}
	return nil
}

type storerLoader struct {
	s storer.Storer
}

func (l storerLoader) Load(*transport.Endpoint) (storer.Storer, error) {
	return l.s, nil
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
