package model

// UserAuthorization grants a role on a project (maps to o_UserAuthorization).
type UserAuthorization struct {
	ID        int64 `json:"id"`
	UserID    int64 `json:"userId"`
	ProjectID int64 `json:"projectId"`
	RoleID    int64 `json:"roleId"`
}
