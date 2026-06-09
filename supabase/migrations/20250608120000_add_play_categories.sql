-- Add play category tags for filtering and organization.
-- Existing plays default to an empty array.

ALTER TABLE plays
ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN plays.categories IS 'Play category tags (Run, Pass, custom labels, etc.)';
