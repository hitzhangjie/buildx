CREATE TABLE IF NOT EXISTS o_PullRequestAssignment (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_request_id INTEGER NOT NULL,
    o_user_id INTEGER NOT NULL,
    FOREIGN KEY (o_request_id) REFERENCES o_PullRequest(o_id) ON DELETE CASCADE,
    FOREIGN KEY (o_user_id) REFERENCES o_User(o_id),
    UNIQUE(o_request_id, o_user_id)
);

CREATE INDEX IF NOT EXISTS idx_PullRequestAssignment_request ON o_PullRequestAssignment(o_request_id);
