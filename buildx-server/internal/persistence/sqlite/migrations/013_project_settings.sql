-- 013_project_settings: Add project management toggles and settings JSON columns
-- Mirrors OneDev's JPA @Lob columns on the o_Project table

-- Management toggles (default to true except timeTracking)
ALTER TABLE o_Project ADD COLUMN o_codeManagement INTEGER NOT NULL DEFAULT 1;
ALTER TABLE o_Project ADD COLUMN o_packManagement INTEGER NOT NULL DEFAULT 1;
ALTER TABLE o_Project ADD COLUMN o_issueManagement INTEGER NOT NULL DEFAULT 1;
ALTER TABLE o_Project ADD COLUMN o_timeTracking INTEGER NOT NULL DEFAULT 0;

-- Service desk email address
ALTER TABLE o_Project ADD COLUMN o_serviceDeskEmailAddress TEXT;

-- Settings stored as JSON TEXT columns (mirrors OneDev @Lob)
ALTER TABLE o_Project ADD COLUMN o_gitPackConfig TEXT NOT NULL DEFAULT '{}';
ALTER TABLE o_Project ADD COLUMN o_codeAnalysisSetting TEXT NOT NULL DEFAULT '{}';
ALTER TABLE o_Project ADD COLUMN o_aiSetting TEXT NOT NULL DEFAULT '{}';
ALTER TABLE o_Project ADD COLUMN o_branchProtections TEXT NOT NULL DEFAULT '[]';
ALTER TABLE o_Project ADD COLUMN o_tagProtections TEXT NOT NULL DEFAULT '[]';
ALTER TABLE o_Project ADD COLUMN o_issueSetting TEXT NOT NULL DEFAULT '{}';
ALTER TABLE o_Project ADD COLUMN o_buildSetting TEXT NOT NULL DEFAULT '{}';
ALTER TABLE o_Project ADD COLUMN o_pullRequestSetting TEXT NOT NULL DEFAULT '{}';
ALTER TABLE o_Project ADD COLUMN o_packSetting TEXT NOT NULL DEFAULT '{}';
ALTER TABLE o_Project ADD COLUMN o_workspaceSetting TEXT NOT NULL DEFAULT '{}';
ALTER TABLE o_Project ADD COLUMN o_namedCommitQueries TEXT NOT NULL DEFAULT '[]';
ALTER TABLE o_Project ADD COLUMN o_namedCodeCommentQueries TEXT NOT NULL DEFAULT '[]';
ALTER TABLE o_Project ADD COLUMN o_webHooks TEXT NOT NULL DEFAULT '[]';
ALTER TABLE o_Project ADD COLUMN o_contributedSettings TEXT NOT NULL DEFAULT '{}';
ALTER TABLE o_Project ADD COLUMN o_workspaceSpecs TEXT NOT NULL DEFAULT '[]';
