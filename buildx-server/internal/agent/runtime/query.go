package runtime

import "strings"

// AgentQueryFilter represents search criteria for querying agents.
type AgentQueryFilter struct {
	Name        string
	Status      string // "online", "offline", "paused"
	OS          string
	OSArch      string
	IPAddress   string
	HasAttribute string // "name:value"
	FreeText    string
}

// ParseAgentQuery parses a OneDev-style agent query string into a structured filter.
//
// Supported syntax:
//   "Name" is "xxx"          -- exact name match
//   "Status" is Online       -- filter by status (Online/Offline/Paused)
//   "Os" is "Linux"          -- filter by OS name
//   "Os Arch" is "amd64"     -- filter by OS architecture
//   "IP Address" is "x.x.x.x" -- filter by IP address
//   free text                -- matches name, OS, or OS version (substring, case-insensitive)
func ParseAgentQuery(query string) AgentQueryFilter {
	var filter AgentQueryFilter
	query = strings.TrimSpace(query)
	if query == "" {
		return filter
	}

	// Try to parse structured conditions.
	// Look for quoted values: "Field Name" is "value"
	s := query
	for s != "" {
		s = strings.TrimSpace(s)

		// Check for quoted field: "Some Field" is "value"
		if strings.HasPrefix(s, "\"") {
			endQuote := strings.Index(s[1:], "\"")
			if endQuote < 0 {
				// Malformed; treat remainder as free text
				if filter.FreeText == "" {
					filter.FreeText = s
				} else {
					filter.FreeText += " " + s
				}
				break
			}
			fieldName := s[1 : 1+endQuote]
			rest := strings.TrimSpace(s[1+endQuote+1:])

			// Expect "is"
			if !strings.HasPrefix(strings.ToLower(rest), "is ") {
				if filter.FreeText == "" {
					filter.FreeText = s
				} else {
					filter.FreeText += " " + s
				}
				s = rest
				continue
			}
			rest = strings.TrimSpace(rest[3:])

			// Check if value is quoted
			var value string
			if strings.HasPrefix(rest, "\"") {
				endVal := strings.Index(rest[1:], "\"")
				if endVal < 0 {
					value = rest[1:]
					s = ""
				} else {
					value = rest[1 : 1+endVal]
					s = strings.TrimSpace(rest[1+endVal+1:])
				}
			} else {
				// Unquoted value: read until end or next quoted field
				nextQuote := strings.Index(rest, "\"")
				if nextQuote < 0 {
					value = strings.TrimSpace(rest)
					s = ""
				} else {
					value = strings.TrimSpace(rest[:nextQuote])
					s = rest[nextQuote:]
				}
			}

			switch strings.ToLower(fieldName) {
			case "name":
				filter.Name = value
			case "status":
				filter.Status = strings.ToLower(value)
			case "os":
				filter.OS = value
			case "os arch":
				filter.OSArch = value
			case "ip address":
				filter.IPAddress = value
			default:
				// Unknown field; treat as free text
				if filter.FreeText == "" {
					filter.FreeText = fieldName + " " + value
				} else {
					filter.FreeText += " " + fieldName + " " + value
				}
			}
			continue
		}

		// No leading quote — this is free text.
		// Consume rest of string as free text.
		if filter.FreeText == "" {
			filter.FreeText = s
		} else {
			filter.FreeText += " " + s
		}
		break
	}

	return filter
}
