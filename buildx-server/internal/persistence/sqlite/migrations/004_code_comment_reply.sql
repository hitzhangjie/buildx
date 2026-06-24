CREATE TABLE IF NOT EXISTS o_CodeCommentReply (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_comment_id INTEGER NOT NULL REFERENCES o_CodeComment (o_id) ON DELETE CASCADE,
    o_user_id INTEGER NOT NULL REFERENCES o_User (o_id) ON DELETE CASCADE,
    o_content TEXT NOT NULL,
    o_createDate TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_codecommentreply_comment ON o_CodeCommentReply (o_comment_id);
