CREATE TABLE IF NOT EXISTS o_PullRequestLabel (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_request_id INTEGER NOT NULL,
    o_label TEXT NOT NULL,
    FOREIGN KEY (o_request_id) REFERENCES o_PullRequest(o_id) ON DELETE CASCADE,
    UNIQUE(o_request_id, o_label)
);

CREATE INDEX IF NOT EXISTS idx_PullRequestLabel_request ON o_PullRequestLabel(o_request_id);
