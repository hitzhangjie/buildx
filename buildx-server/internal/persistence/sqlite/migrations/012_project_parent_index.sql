-- Add index on o_parent_id for efficient child-project queries.
-- Maps to OneDev index on Project.parent column.
CREATE INDEX IF NOT EXISTS idx_project_parent_id ON o_Project (o_parent_id);
