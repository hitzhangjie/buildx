CREATE TABLE IF NOT EXISTS o_PullRequest (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_number INTEGER NOT NULL,
    o_numberScope_id INTEGER NOT NULL REFERENCES o_Project (o_id) ON DELETE CASCADE,
    o_title TEXT NOT NULL,
    o_description TEXT NOT NULL DEFAULT '',
    o_status TEXT NOT NULL DEFAULT 'OPEN',
    o_targetProject_id INTEGER NOT NULL REFERENCES o_Project (o_id) ON DELETE CASCADE,
    o_sourceProject_id INTEGER NOT NULL REFERENCES o_Project (o_id) ON DELETE CASCADE,
    o_targetBranch TEXT NOT NULL,
    o_sourceBranch TEXT NOT NULL,
    o_submitter_id INTEGER NOT NULL REFERENCES o_User (o_id),
    o_submitDate TEXT NOT NULL,
    o_closeDate TEXT,
    o_mergeStrategy TEXT NOT NULL DEFAULT 'CREATE_MERGE_COMMIT_IF_NECESSARY',
    o_baseCommitHash TEXT NOT NULL DEFAULT '',
    o_buildCommitHash TEXT NOT NULL DEFAULT '',
    o_commentCount INTEGER NOT NULL DEFAULT 0,
    UNIQUE (o_numberScope_id, o_number)
);

CREATE INDEX IF NOT EXISTS idx_pull_request_status ON o_PullRequest (o_status);
CREATE INDEX IF NOT EXISTS idx_pull_request_target_project ON o_PullRequest (o_targetProject_id);
CREATE INDEX IF NOT EXISTS idx_pull_request_source_project ON o_PullRequest (o_sourceProject_id);
CREATE INDEX IF NOT EXISTS idx_pull_request_submitter ON o_PullRequest (o_submitter_id);
CREATE INDEX IF NOT EXISTS idx_pull_request_submit_date ON o_PullRequest (o_submitDate);

CREATE TABLE IF NOT EXISTS o_PullRequestComment (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_request_id INTEGER NOT NULL REFERENCES o_PullRequest (o_id) ON DELETE CASCADE,
    o_user_id INTEGER NOT NULL REFERENCES o_User (o_id),
    o_content TEXT NOT NULL,
    o_createDate TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pull_request_comment_request ON o_PullRequestComment (o_request_id);

CREATE TABLE IF NOT EXISTS o_PullRequestReview (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_request_id INTEGER NOT NULL REFERENCES o_PullRequest (o_id) ON DELETE CASCADE,
    o_user_id INTEGER NOT NULL REFERENCES o_User (o_id),
    o_status TEXT NOT NULL DEFAULT 'PENDING',
    o_date TEXT,
    UNIQUE (o_request_id, o_user_id)
);

CREATE INDEX IF NOT EXISTS idx_pull_request_review_request ON o_PullRequestReview (o_request_id);
