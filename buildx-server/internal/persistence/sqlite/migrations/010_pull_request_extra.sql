-- Add last activity tracking and auto-merge support columns to o_PullRequest.
-- Uses ALTER TABLE ADD COLUMN IF NOT EXISTS pattern via pure SQLite by checking
-- if the column already exists (SQLite does not support IF NOT EXISTS for ALTER)

-- Add o_lastActivityDate column (for Phase 2 filter by activity date).
-- Safe to run multiple times: the migration runner catches errors gracefully,
-- and we use a separate migration file so it won't block earlier schema.
ALTER TABLE o_PullRequest ADD COLUMN o_lastActivityDate TEXT;

-- Add auto-merge columns (for Phase 3 auto-merge feature).
ALTER TABLE o_PullRequest ADD COLUMN o_autoMergeEnabled INTEGER DEFAULT 0;
ALTER TABLE o_PullRequest ADD COLUMN o_autoMergeCommitMessage TEXT DEFAULT '';
ALTER TABLE o_PullRequest ADD COLUMN o_sourceBranchDeleted INTEGER DEFAULT 0;
ALTER TABLE o_PullRequest ADD COLUMN o_checkError TEXT DEFAULT '';
