package model

// EmailAddress belongs to a user (maps to o_EmailAddress).
type EmailAddress struct {
	ID       int64  `json:"id"`
	Value    string `json:"value"`
	OwnerID  int64  `json:"ownerId"`
	Primary  bool   `json:"primary"`
	Git      bool   `json:"git"`
}
