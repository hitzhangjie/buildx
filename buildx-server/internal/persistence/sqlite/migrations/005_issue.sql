CREATE TABLE IF NOT EXISTS o_Issue (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_project_id INTEGER NOT NULL REFERENCES o_Project (o_id) ON DELETE CASCADE,
    o_number INTEGER NOT NULL,
    o_title TEXT NOT NULL,
    o_description TEXT NOT NULL DEFAULT '',
    o_state TEXT NOT NULL DEFAULT 'Open',
    o_stateOrdinal INTEGER NOT NULL DEFAULT 0,
    o_submitter_id INTEGER NOT NULL REFERENCES o_User (o_id),
    o_submitDate TEXT NOT NULL,
    o_voteCount INTEGER NOT NULL DEFAULT 0,
    o_commentCount INTEGER NOT NULL DEFAULT 0,
    o_confidential INTEGER NOT NULL DEFAULT 0,
    o_uuid TEXT NOT NULL,
    UNIQUE (o_project_id, o_number)
);

CREATE INDEX IF NOT EXISTS idx_issue_project ON o_Issue (o_project_id);
CREATE INDEX IF NOT EXISTS idx_issue_state ON o_Issue (o_state);
CREATE INDEX IF NOT EXISTS idx_issue_number ON o_Issue (o_number);
CREATE INDEX IF NOT EXISTS idx_issue_submitDate ON o_Issue (o_submitDate);

CREATE TABLE IF NOT EXISTS o_IssueComment (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_issue_id INTEGER NOT NULL REFERENCES o_Issue (o_id) ON DELETE CASCADE,
    o_user_id INTEGER NOT NULL REFERENCES o_User (o_id),
    o_content TEXT NOT NULL,
    o_createDate TEXT NOT NULL,
    o_revisionCount INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_issuecomment_issue ON o_IssueComment (o_issue_id);
