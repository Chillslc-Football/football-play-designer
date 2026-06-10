-- Allow team_owner to delete a team and cascade related data.
-- Apply in Supabase SQL editor if team delete only clears UI state.

CREATE OR REPLACE FUNCTION public.delete_team(p_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_team_owner(p_team_id) THEN
    RAISE EXCEPTION 'Only team owners can delete teams';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_team_id) THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  UPDATE public.profiles
  SET last_team_id = NULL
  WHERE last_team_id = p_team_id;

  DELETE FROM public.teams
  WHERE id = p_team_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_team(uuid) TO authenticated;

-- Verify in SQL editor:
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_schema = 'public' AND routine_name = 'delete_team';
