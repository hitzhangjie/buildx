-- Agent runtime schema
-- Creates o_Agent (extended), o_AgentAttribute, and o_AgentToken tables.

CREATE TABLE IF NOT EXISTS o_Agent (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_name TEXT NOT NULL,
    o_token TEXT,
    o_os TEXT NOT NULL DEFAULT '',
    o_arch TEXT NOT NULL DEFAULT '',
    o_version TEXT NOT NULL DEFAULT '',
    o_osVersion TEXT NOT NULL DEFAULT '',
    o_ipAddress TEXT NOT NULL DEFAULT '',
    o_cpuCount INTEGER NOT NULL DEFAULT 0,
    o_paused INTEGER NOT NULL DEFAULT 0,
    o_online INTEGER NOT NULL DEFAULT 0,
    o_cpuLoad REAL NOT NULL DEFAULT 0.0,
    o_memTotal INTEGER NOT NULL DEFAULT 0,
    o_memFree INTEGER NOT NULL DEFAULT 0,
    o_diskTotal INTEGER NOT NULL DEFAULT 0,
    o_diskFree INTEGER NOT NULL DEFAULT 0,
    o_lastActiveDate TEXT,
    o_agentVersion TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_agent_name ON o_Agent (o_name);
CREATE INDEX IF NOT EXISTS idx_agent_token ON o_Agent (o_token);
CREATE INDEX IF NOT EXISTS idx_agent_online ON o_Agent (o_online);

CREATE TABLE IF NOT EXISTS o_AgentAttribute (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_agent_id INTEGER NOT NULL REFERENCES o_Agent (o_id) ON DELETE CASCADE,
    o_name TEXT NOT NULL,
    o_value TEXT NOT NULL DEFAULT '',
    UNIQUE (o_agent_id, o_name)
);

CREATE INDEX IF NOT EXISTS idx_agentAttribute_agent ON o_AgentAttribute (o_agent_id);

CREATE TABLE IF NOT EXISTS o_AgentToken (
    o_id INTEGER PRIMARY KEY AUTOINCREMENT,
    o_agent_id INTEGER NOT NULL REFERENCES o_Agent (o_id) ON DELETE CASCADE,
    o_token TEXT NOT NULL,
    o_createDate TEXT NOT NULL,
    UNIQUE (o_agent_id, o_token)
);

CREATE INDEX IF NOT EXISTS idx_agentToken_agent ON o_AgentToken (o_agent_id);
CREATE INDEX IF NOT EXISTS idx_agentToken_token ON o_AgentToken (o_token);
