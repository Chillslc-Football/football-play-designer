-- Phase 2A: all team members can access every built-in channel.
-- Channel names are audience labels, not permission walls.

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
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_team_member(p_team_id) THEN
    RETURN false;
  END IF;

  IF p_thread_kind IN ('everyone', 'coaches', 'players', 'parents') THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_message_thread_kind(uuid, public.team_message_thread_kind) TO authenticated;
