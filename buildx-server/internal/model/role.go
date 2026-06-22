package model

const RoleOwnerID = int64(1)

// Role defines a permission bundle (maps to o_Role).
type Role struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}
