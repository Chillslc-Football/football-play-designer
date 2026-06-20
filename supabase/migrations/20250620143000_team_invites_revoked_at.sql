-- Add revoked_at to team_invites if the table was created before this column existed.

ALTER TABLE public.team_invites
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
