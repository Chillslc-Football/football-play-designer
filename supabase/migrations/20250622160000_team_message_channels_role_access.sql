-- Restore role-based access for built-in messaging channels.

CREATE OR REPLACE FUNCTION public.can_access_message_thread_kind(
  p_team_id uuid,
  p_thread_kind public.team_message_thread_kind
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_role public.team_role;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_team_member(p_team_id) THEN
    RETURN false;
  END IF;

  v_role := public.get_auth_team_member_role(p_team_id);

  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  IF v_role IN ('team_owner', 'coach') THEN
    RETURN true;
  END IF;

  IF v_role = 'player' THEN
    RETURN p_thread_kind IN ('everyone', 'players');
  END IF;

  IF v_role = 'parent' THEN
    RETURN p_thread_kind IN ('everyone', 'parents');
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_message_thread_kind(uuid, public.team_message_thread_kind) TO authenticated;
