package issuesetting

// StateSpec defines a workflow state (OneDev StateSpec).
type StateSpec struct {
	Name  string `json:"name"`
	Color string `json:"color,omitempty"`
}

// BoardSpec defines a kanban board (OneDev BoardSpec subset).
type BoardSpec struct {
	Name             string   `json:"name"`
	BaseQuery        string   `json:"baseQuery,omitempty"`
	BacklogBaseQuery string   `json:"backlogBaseQuery,omitempty"`
	IdentifyField    string   `json:"identifyField"`
	Columns          []string `json:"columns"`
}

// NamedIssueQuery is a saved issue filter.
type NamedIssueQuery struct {
	Name  string `json:"name"`
	Query string `json:"query"`
}

// GlobalIssueSetting mirrors OneDev GlobalIssueSetting (subset).
type GlobalIssueSetting struct {
	StateSpecs   []StateSpec       `json:"stateSpecs"`
	BoardSpecs   []BoardSpec       `json:"boardSpecs"`
	NamedQueries []NamedIssueQuery `json:"namedQueries,omitempty"`
}

// Default returns OneDev-compatible default issue settings.
func Default() *GlobalIssueSetting {
	return &GlobalIssueSetting{
		StateSpecs: []StateSpec{
			{Name: "Open", Color: "#2095F2"},
			{Name: "In Progress", Color: "#FFA700"},
			{Name: "In Review", Color: "#9C26B0"},
			{Name: "Closed", Color: "#1BC5BD"},
		},
		BoardSpecs: []BoardSpec{
			{
				Name:             "State",
				IdentifyField:    "State",
				BacklogBaseQuery: `"State" is "Open"`,
				Columns:          []string{"Open", "In Progress", "In Review", "Closed"},
			},
		},
		NamedQueries: []NamedIssueQuery{
			{Name: "Open", Query: `"State" is "Open"`},
			{Name: "In Progress", Query: `"State" is "In Progress"`},
			{Name: "In Review", Query: `"State" is "In Review"`},
			{Name: "Closed", Query: `"State" is "Closed"`},
		},
	}
}

// StateNames returns ordered state names from settings.
func (g *GlobalIssueSetting) StateNames() []string {
	names := make([]string, 0, len(g.StateSpecs))
	for _, s := range g.StateSpecs {
		names = append(names, s.Name)
	}
	return names
}

// DefaultBoard returns the first board spec or a built-in default.
func (g *GlobalIssueSetting) DefaultBoard() BoardSpec {
	if len(g.BoardSpecs) > 0 {
		return g.BoardSpecs[0]
	}
	return Default().BoardSpecs[0]
}
