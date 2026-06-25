-- Add missing Build fields matching OneDev Build.java.
ALTER TABLE o_Build ADD COLUMN o_token VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE o_Build ADD COLUMN o_workDirPath VARCHAR(500) NOT NULL DEFAULT '';
ALTER TABLE o_Build ADD COLUMN o_checkoutPaths TEXT NOT NULL DEFAULT '[]';
ALTER TABLE o_Build ADD COLUMN o_submitSequence INTEGER NOT NULL DEFAULT 1;
ALTER TABLE o_Build ADD COLUMN o_retryDate VARCHAR(40);
