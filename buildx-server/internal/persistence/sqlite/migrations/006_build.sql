CREATE TABLE IF NOT EXISTS o_Build (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_project_id INTEGER NOT NULL REFERENCES o_Project (o_id) ON DELETE CASCADE,
    o_numberScope_id INTEGER NOT NULL REFERENCES o_Project (o_id) ON DELETE CASCADE,
    o_number INTEGER NOT NULL,
    o_jobName TEXT NOT NULL,
    o_status TEXT NOT NULL DEFAULT 'WAITING',
    o_refName TEXT NOT NULL DEFAULT '',
    o_commitHash TEXT NOT NULL DEFAULT '',
    o_version TEXT NOT NULL DEFAULT '',
    o_description TEXT NOT NULL DEFAULT '',
    o_submitDate TEXT NOT NULL,
    o_pendingDate TEXT,
    o_runningDate TEXT,
    o_finishDate TEXT,
    o_submitReason TEXT NOT NULL DEFAULT '',
    o_submitter_id INTEGER NOT NULL REFERENCES o_User (o_id),
    o_canceller_id INTEGER REFERENCES o_User (o_id),
    o_paused INTEGER NOT NULL DEFAULT 0,
    o_uuid TEXT NOT NULL,
    UNIQUE (o_numberScope_id, o_number)
);

CREATE INDEX IF NOT EXISTS idx_build_project ON o_Build (o_project_id);
CREATE INDEX IF NOT EXISTS idx_build_number ON o_Build (o_number);
CREATE INDEX IF NOT EXISTS idx_build_status ON o_Build (o_status);
CREATE INDEX IF NOT EXISTS idx_build_jobName ON o_Build (o_jobName);
CREATE INDEX IF NOT EXISTS idx_build_refName ON o_Build (o_refName);
CREATE INDEX IF NOT EXISTS idx_build_commitHash ON o_Build (o_commitHash);
CREATE INDEX IF NOT EXISTS idx_build_submitDate ON o_Build (o_submitDate);
CREATE INDEX IF NOT EXISTS idx_build_finishDate ON o_Build (o_finishDate);

CREATE TABLE IF NOT EXISTS o_BuildParam (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_build_id INTEGER NOT NULL REFERENCES o_Build (o_id) ON DELETE CASCADE,
    o_name TEXT NOT NULL,
    o_type TEXT NOT NULL DEFAULT 'Text',
    o_value TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_buildparam_build ON o_BuildParam (o_build_id);

CREATE TABLE IF NOT EXISTS o_BuildLabel (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_build_id INTEGER NOT NULL REFERENCES o_Build (o_id) ON DELETE CASCADE,
    o_name TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_buildlabel_build ON o_BuildLabel (o_build_id);
