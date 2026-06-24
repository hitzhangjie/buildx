CREATE TABLE IF NOT EXISTS o_CodeComment (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_project_id INTEGER NOT NULL REFERENCES o_Project (o_id) ON DELETE CASCADE,
    o_user_id INTEGER NOT NULL REFERENCES o_User (o_id) ON DELETE CASCADE,
    o_content TEXT NOT NULL,
    o_createDate TEXT NOT NULL,
    o_replyCount INTEGER NOT NULL DEFAULT 0,
    o_resolved INTEGER NOT NULL DEFAULT 0,
    o_uuid TEXT NOT NULL,
    o_commitHash TEXT NOT NULL,
    o_path TEXT NOT NULL,
    o_fromRow INTEGER NOT NULL,
    o_fromColumn INTEGER NOT NULL,
    o_toRow INTEGER NOT NULL,
    o_toColumn INTEGER NOT NULL,
    o_tabWidth INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_codecomment_project ON o_CodeComment (o_project_id);
CREATE INDEX IF NOT EXISTS idx_codecomment_mark ON o_CodeComment (o_commitHash, o_path);
