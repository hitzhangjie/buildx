package model

// UserAuthorization grants a role on a project (maps to o_UserAuthorization).
type UserAuthorization struct {
	ID        int64 `json:"id"`
	UserID    int64 `json:"userId"`
	ProjectID int64 `json:"projectId"`
	RoleID    int64 `json:"roleId"`
}

// UserAuthorizationView is a denormalized authorization row returned to the frontend.
// It groups roles by project path for the bean list editor.
type UserAuthorizationView struct {
	ProjectPath string   `json:"projectPath"`
	RoleNames   []string `json:"roleNames"`
}

// UserAuthorizationInput is the JSON shape accepted from the frontend when
// syncing a user's project authorizations.
type UserAuthorizationInput struct {
	ProjectPath string   `json:"projectPath"`
	RoleNames   []string `json:"roleNames"`
}

// ProjectUserAuthorizationView is a denormalized authorization row returned to
// the frontend for project-level user authorization listing. It groups roles by
// user name for the bean list editor.
type ProjectUserAuthorizationView struct {
	UserName  string   `json:"userName"`
	RoleNames []string `json:"roleNames"`
}

// ProjectUserAuthorizationInput is the JSON shape accepted from the frontend
// when syncing a project's user authorizations.
type ProjectUserAuthorizationInput struct {
	UserName  string   `json:"userName"`
	RoleNames []string `json:"roleNames"`
}
