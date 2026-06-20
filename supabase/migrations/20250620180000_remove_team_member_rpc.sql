-- Remove a user from a team (membership only; auth/profile rows are preserved).

CREATE OR REPLACE FUNCTION public.remove_team_member(
  p_team_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role public.team_role;
  v_target_role public.team_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot remove yourself from the team';
  END IF;

  SELECT role
  INTO v_caller_role
  FROM public.team_members
  WHERE team_id = p_team_id
    AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not a member of this team';
  END IF;

  IF v_caller_role NOT IN ('team_owner', 'coach') THEN
    RAISE EXCEPTION 'Not allowed to remove members';
  END IF;

  SELECT role
  INTO v_target_role
  FROM public.team_members
  WHERE team_id = p_team_id
    AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  IF v_target_role = 'team_owner' THEN
    RAISE EXCEPTION 'Cannot remove a team owner';
  END IF;

  IF v_caller_role = 'coach' AND v_target_role = 'coach' THEN
    RAISE EXCEPTION 'Coaches cannot remove other coaches';
  END IF;

  DELETE FROM public.team_members
  WHERE team_id = p_team_id
    AND user_id = p_user_id;

  UPDATE public.profiles
  SET last_team_id = NULL
  WHERE id = p_user_id
    AND last_team_id = p_team_id;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_team_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_team_member(uuid, uuid) TO authenticated;
