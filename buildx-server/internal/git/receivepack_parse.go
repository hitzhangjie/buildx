package git

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
)

var errPktFlush = errors.New("pkt-line flush")

// RefUpdate describes one ref update from a git receive-pack command section.
type RefUpdate struct {
	OldHash string
	NewHash string
	RefName string
}

// ParseReceiveUpdates reads ref update commands from the beginning of a
// receive-pack request body (before the packfile section).
func ParseReceiveUpdates(body []byte) ([]RefUpdate, error) {
	r := bytes.NewReader(body)
	var updates []RefUpdate
	for {
		line, err := readPktLine(r)
		if errors.Is(err, errPktFlush) {
			break
		}
		if err != nil {
			if err == io.EOF && len(updates) == 0 {
				return nil, nil
			}
			return updates, err
		}
		upd, err := parseReceiveCommand(line)
		if err != nil {
			return updates, err
		}
		updates = append(updates, upd)
	}
	return updates, nil
}

func parseReceiveCommand(line string) (RefUpdate, error) {
	nul := strings.IndexByte(line, 0)
	if nul >= 0 {
		line = line[:nul]
	}
	fields := strings.Fields(line)
	if len(fields) < 3 {
		return RefUpdate{}, fmt.Errorf("invalid receive command: %q", line)
	}
	return RefUpdate{
		OldHash: fields[0],
		NewHash: fields[1],
		RefName: fields[2],
	}, nil
}

func readPktLine(r *bytes.Reader) (string, error) {
	var hdr [4]byte
	if _, err := io.ReadFull(r, hdr[:]); err != nil {
		return "", err
	}
	if string(hdr[:]) == "0000" {
		return "", errPktFlush
	}
	n, err := strconv.ParseUint(string(hdr[:]), 16, 16)
	if err != nil || n < 4 {
		return "", fmt.Errorf("invalid pkt-line length %q", string(hdr[:]))
	}
	payloadLen := int(n) - 4
	buf := make([]byte, payloadLen)
	if _, err := io.ReadFull(r, buf); err != nil {
		return "", err
	}
	return string(buf), nil
}

// ShortRefName strips refs/heads/ or refs/tags/ prefix for trigger matching.
func ShortRefName(ref string) string {
	for _, prefix := range []string{"refs/heads/", "refs/tags/"} {
		if strings.HasPrefix(ref, prefix) {
			return strings.TrimPrefix(ref, prefix)
		}
	}
	return ref
}

// IsZeroHash reports whether a git object id is the null SHA.
func IsZeroHash(hash string) bool {
	return hash == "" || strings.EqualFold(hash, strings.Repeat("0", 40))
}
