-- Session management (cookie-based auth persistence)
-- Mirrors OneDev's two-layer model: session cookie (short-lived) + remember-me (long-lived)

CREATE TABLE IF NOT EXISTS o_Session (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_token TEXT NOT NULL UNIQUE,
    o_user_id INTEGER NOT NULL REFERENCES o_User (o_id) ON DELETE CASCADE,
    o_createDate TEXT NOT NULL,
    o_expireDate TEXT NOT NULL,
    o_rememberMe INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_session_token ON o_Session (o_token);
CREATE INDEX IF NOT EXISTS idx_session_user ON o_Session (o_user_id);
