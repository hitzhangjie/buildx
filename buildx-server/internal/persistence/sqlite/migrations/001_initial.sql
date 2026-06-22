-- Phase 1 MVP schema (OneDev o_* naming for future compatibility)

CREATE TABLE IF NOT EXISTS o_ModelVersion (
    o_id INTEGER PRIMARY KEY,
    o_versionColumn TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS o_User (
    o_id INTEGER PRIMARY KEY,
    o_name TEXT NOT NULL UNIQUE,
    o_fullName TEXT NOT NULL DEFAULT '',
    o_type TEXT NOT NULL DEFAULT 'ORDINARY',
    o_disabled INTEGER NOT NULL DEFAULT 0,
    o_password TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_user_name ON o_User (o_name);
CREATE INDEX IF NOT EXISTS idx_user_fullName ON o_User (o_fullName);

CREATE TABLE IF NOT EXISTS o_EmailAddress (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_value TEXT NOT NULL UNIQUE,
    o_owner_id INTEGER NOT NULL REFERENCES o_User (o_id) ON DELETE CASCADE,
    o_primary INTEGER NOT NULL DEFAULT 0,
    o_git INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS o_Role (
    o_id INTEGER PRIMARY KEY,
    o_name TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_role_name ON o_Role (o_name);

CREATE TABLE IF NOT EXISTS o_ProjectLastActivityDate (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS o_Project (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_name TEXT NOT NULL,
    o_path TEXT NOT NULL,
    o_pathLen INTEGER NOT NULL,
    o_key TEXT UNIQUE,
    o_description TEXT NOT NULL DEFAULT '',
    o_parent_id INTEGER REFERENCES o_Project (o_id) ON DELETE SET NULL,
    o_lastActivityDate_id INTEGER NOT NULL UNIQUE REFERENCES o_ProjectLastActivityDate (o_id),
    o_createDate TEXT NOT NULL,
    UNIQUE (o_parent_id, o_name)
);

CREATE INDEX IF NOT EXISTS idx_project_path ON o_Project (o_path);
CREATE INDEX IF NOT EXISTS idx_project_name ON o_Project (o_name);

CREATE TABLE IF NOT EXISTS o_UserAuthorization (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_user_id INTEGER NOT NULL REFERENCES o_User (o_id) ON DELETE CASCADE,
    o_project_id INTEGER NOT NULL REFERENCES o_Project (o_id) ON DELETE CASCADE,
    o_role_id INTEGER NOT NULL REFERENCES o_Role (o_id),
    UNIQUE (o_user_id, o_project_id, o_role_id)
);

CREATE TABLE IF NOT EXISTS o_AccessToken (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_name TEXT NOT NULL,
    o_owner_id INTEGER NOT NULL REFERENCES o_User (o_id) ON DELETE CASCADE,
    o_value TEXT NOT NULL UNIQUE,
    o_hasOwnerPermissions INTEGER NOT NULL DEFAULT 0,
    o_createDate TEXT NOT NULL,
    o_expireDate TEXT,
    UNIQUE (o_owner_id, o_name)
);

CREATE INDEX IF NOT EXISTS idx_access_token_owner ON o_AccessToken (o_owner_id);
CREATE INDEX IF NOT EXISTS idx_access_token_value ON o_AccessToken (o_value);

CREATE TABLE IF NOT EXISTS o_Setting (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_key TEXT NOT NULL UNIQUE,
    o_value BLOB
);
