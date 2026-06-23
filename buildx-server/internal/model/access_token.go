package model

import "time"

// AccessToken is a personal access token (maps to o_AccessToken).
type AccessToken struct {
	ID                  int64      `json:"id"`
	Name                string     `json:"name"`
	OwnerID             int64      `json:"ownerId"`
	Value               string     `json:"value,omitempty"`
	HasOwnerPermissions bool       `json:"hasOwnerPermissions"`
	CreateDate          time.Time  `json:"createDate"`
	ExpireDate          *time.Time `json:"expireDate,omitempty"`
}
