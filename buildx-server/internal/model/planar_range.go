package model

import (
	"fmt"
	"strconv"
	"strings"
)

const SourcePositionPrefix = "source-"

// PlanarRange is a zero-based line/column selection in a text file.
// String format matches OneDev: "{fromRow}.{fromColumn}-{toRow}.{toColumn}-{tabWidth}".
type PlanarRange struct {
	FromRow    int `json:"fromRow"`
	FromColumn int `json:"fromColumn"`
	ToRow      int `json:"toRow"`
	ToColumn   int `json:"toColumn"`
	TabWidth   int `json:"tabWidth,omitempty"`
}

func (r PlanarRange) String() string {
	tabWidth := r.TabWidth
	if tabWidth <= 0 {
		tabWidth = 1
	}
	return fmt.Sprintf("%d.%d-%d.%d-%d", r.FromRow, r.FromColumn, r.ToRow, r.ToColumn, tabWidth)
}

// SourcePosition returns the blob page position query value.
func (r PlanarRange) SourcePosition() string {
	return SourcePositionPrefix + r.String()
}

// ParseSourcePosition parses a blob position query value into a range.
func ParseSourcePosition(position string) (*PlanarRange, error) {
	if position == "" {
		return nil, nil
	}
	if !strings.HasPrefix(position, SourcePositionPrefix) {
		return nil, fmt.Errorf("invalid source position prefix")
	}
	return ParsePlanarRange(position[len(SourcePositionPrefix):])
}

// ParsePlanarRange parses OneDev's planar range string.
func ParsePlanarRange(s string) (*PlanarRange, error) {
	parts := strings.Split(s, "-")
	if len(parts) < 2 || len(parts) > 3 {
		return nil, fmt.Errorf("invalid planar range: %q", s)
	}

	fromParts := strings.Split(parts[0], ".")
	if len(fromParts) != 2 {
		return nil, fmt.Errorf("invalid planar range from: %q", parts[0])
	}
	toParts := strings.Split(parts[1], ".")
	if len(toParts) != 2 {
		return nil, fmt.Errorf("invalid planar range to: %q", parts[1])
	}

	fromRow, err := strconv.Atoi(fromParts[0])
	if err != nil {
		return nil, fmt.Errorf("invalid from row: %w", err)
	}
	fromCol, err := strconv.Atoi(fromParts[1])
	if err != nil {
		return nil, fmt.Errorf("invalid from column: %w", err)
	}
	toRow, err := strconv.Atoi(toParts[0])
	if err != nil {
		return nil, fmt.Errorf("invalid to row: %w", err)
	}
	toCol, err := strconv.Atoi(toParts[1])
	if err != nil {
		return nil, fmt.Errorf("invalid to column: %w", err)
	}

	tabWidth := 1
	if len(parts) == 3 {
		tabWidth, err = strconv.Atoi(parts[2])
		if err != nil {
			return nil, fmt.Errorf("invalid tab width: %w", err)
		}
	}

	return &PlanarRange{
		FromRow:    fromRow,
		FromColumn: fromCol,
		ToRow:      toRow,
		ToColumn:   toCol,
		TabWidth:   tabWidth,
	}, nil
}
