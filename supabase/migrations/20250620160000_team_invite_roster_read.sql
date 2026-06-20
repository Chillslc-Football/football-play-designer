-- Read-only team invite roster for all team members (no token exposed).
-- Coaches/owners continue using direct team_invites SELECT via can_edit_team (includes token).

CREATE OR REPLACE FUNCTION public.get_team_invite_roster(p_team_id uuid)
RETURNS TABLE (
  id uuid,
  team_id uuid,
  role public.team_role,
  email text,
  expires_at timestamptz,
  created_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ti.id,
    ti.team_id,
    ti.role,
    ti.email,
    ti.expires_at,
    ti.created_at,
    ti.accepted_at,
    ti.revoked_at
  FROM public.team_invites ti
  WHERE ti.team_id = p_team_id
    AND ti.accepted_at IS NULL
    AND public.is_team_member(p_team_id)
  ORDER BY ti.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_invite_roster(uuid) TO authenticated;
