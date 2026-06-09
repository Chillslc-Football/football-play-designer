-- Defensive play front and future opponent formation references.

ALTER TABLE plays
ADD COLUMN IF NOT EXISTS front_id text,
ADD COLUMN IF NOT EXISTS front_name text,
ADD COLUMN IF NOT EXISTS opponent_formation_id text,
ADD COLUMN IF NOT EXISTS opponent_formation_name text;

COMMENT ON COLUMN plays.front_id IS 'Built-in or custom defensive front id (e.g. 4-3, nickel)';
COMMENT ON COLUMN plays.front_name IS 'Defensive front label at save time';
COMMENT ON COLUMN plays.opponent_formation_id IS 'Optional opposing offensive formation id for defensive plays';
COMMENT ON COLUMN plays.opponent_formation_name IS 'Optional opposing offensive formation label for defensive plays';
