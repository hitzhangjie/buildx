package model

// Well-known user IDs (OneDev-compatible).
const (
	UserUnknownID = int64(-2)
	UserSystemID  = int64(-1)
	UserRootID    = int64(1)
)

const (
	UserSystemName  = "onedev"
	UserUnknownName = "unknown"
)

// UserType mirrors io.onedev.server.model.User.Type.
type UserType string

const (
	UserTypeOrdinary UserType = "ORDINARY"
	UserTypeService  UserType = "SERVICE"
	UserTypeAI       UserType = "AI"
)

// User is the account entity (maps to o_User).
type User struct {
	ID       int64    `json:"id"`
	Name     string   `json:"name"`
	FullName string   `json:"fullName"`
	Type     UserType `json:"type"`
	Disabled bool     `json:"disabled"`
	Password string   `json:"-"`
}
