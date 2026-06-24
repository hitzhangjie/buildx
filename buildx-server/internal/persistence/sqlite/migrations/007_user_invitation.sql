CREATE TABLE IF NOT EXISTS o_UserInvitation (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_emailAddress TEXT NOT NULL UNIQUE,
    o_invitationCode TEXT NOT NULL UNIQUE,
    o_role TEXT NOT NULL DEFAULT 'developer',
    o_createDate TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_invitation_email ON o_UserInvitation (o_emailAddress);
CREATE INDEX IF NOT EXISTS idx_user_invitation_code ON o_UserInvitation (o_invitationCode);
