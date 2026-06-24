CREATE TABLE IF NOT EXISTS o_Iteration (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_project_id INTEGER NOT NULL REFERENCES o_Project (o_id) ON DELETE CASCADE,
    o_name TEXT NOT NULL,
    o_description TEXT NOT NULL DEFAULT '',
    o_startDay INTEGER,
    o_dueDay INTEGER,
    o_closed INTEGER NOT NULL DEFAULT 0,
    UNIQUE (o_project_id, o_name)
);

CREATE INDEX IF NOT EXISTS idx_iteration_project ON o_Iteration (o_project_id);

CREATE TABLE IF NOT EXISTS o_IssueSchedule (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_issue_id INTEGER NOT NULL REFERENCES o_Issue (o_id) ON DELETE CASCADE,
    o_iteration_id INTEGER NOT NULL REFERENCES o_Iteration (o_id) ON DELETE CASCADE,
    UNIQUE (o_issue_id, o_iteration_id)
);

CREATE INDEX IF NOT EXISTS idx_issueschedule_issue ON o_IssueSchedule (o_issue_id);
CREATE INDEX IF NOT EXISTS idx_issueschedule_iteration ON o_IssueSchedule (o_iteration_id);
