CREATE TABLE IF NOT EXISTS o_Workspace (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_numberScope_id INTEGER NOT NULL REFERENCES o_Project (o_id) ON DELETE CASCADE,
    o_number INTEGER NOT NULL,
    o_user_id INTEGER NOT NULL REFERENCES o_User (o_id),
    o_project_id INTEGER NOT NULL REFERENCES o_Project (o_id) ON DELETE CASCADE,
    o_specName TEXT NOT NULL,
    o_branch TEXT,
    o_commitHash TEXT NOT NULL,
    o_status TEXT NOT NULL DEFAULT 'PENDING',
    o_createDate TEXT NOT NULL,
    o_activeDate TEXT,
    o_inactiveDate TEXT,
    o_provisionerName TEXT,
    o_serverAddress TEXT,
    o_agent_id INTEGER REFERENCES o_Agent (o_id) ON DELETE SET NULL,
    o_token TEXT NOT NULL,
    UNIQUE (o_numberScope_id, o_number)
);

CREATE INDEX IF NOT EXISTS idx_workspace_user ON o_Workspace (o_user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_project ON o_Workspace (o_project_id);
CREATE INDEX IF NOT EXISTS idx_workspace_agent ON o_Workspace (o_agent_id);
CREATE INDEX IF NOT EXISTS idx_workspace_spec ON o_Workspace (o_specName);
CREATE INDEX IF NOT EXISTS idx_workspace_status ON o_Workspace (o_status);
CREATE INDEX IF NOT EXISTS idx_workspace_branch ON o_Workspace (o_branch);
CREATE INDEX IF NOT EXISTS idx_workspace_createDate ON o_Workspace (o_createDate);
CREATE INDEX IF NOT EXISTS idx_workspace_activeDate ON o_Workspace (o_activeDate);
CREATE INDEX IF NOT EXISTS idx_workspace_number ON o_Workspace (o_number);
