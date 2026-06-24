package model

import "time"

// InvitationStatus is the web-facing invitation state.
type InvitationStatus string

const (
	InvitationStatusPending  InvitationStatus = "pending"
	InvitationStatusAccepted InvitationStatus = "accepted"
	InvitationStatusExpired  InvitationStatus = "expired"
)

// Invitation maps to o_UserInvitation.
type Invitation struct {
	ID             int64     `json:"id"`
	EmailAddress   string    `json:"emailAddress"`
	InvitationCode string    `json:"-"`
	Role           string    `json:"role,omitempty"`
	CreateDate     time.Time `json:"createDate"`
}
