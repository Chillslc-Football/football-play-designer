-- Feature one team update per team on the mobile Home screen.

ALTER TABLE public.team_updates
ADD COLUMN IF NOT EXISTS show_on_home boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.team_updates.show_on_home IS
  'When true, this update is featured on the mobile Home screen. At most one per team.';

CREATE UNIQUE INDEX IF NOT EXISTS team_updates_one_show_on_home_per_team_idx
  ON public.team_updates (team_id)
  WHERE show_on_home;

CREATE OR REPLACE FUNCTION public.set_team_update_show_on_home(
  p_update_id uuid,
  p_show_on_home boolean
)
RETURNS public.team_updates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_update public.team_updates;
  v_team_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO v_update
  FROM public.team_updates
  WHERE id = p_update_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Update not found';
  END IF;

  v_team_id := v_update.team_id;

  IF NOT public.can_edit_team(v_team_id) THEN
    RAISE EXCEPTION 'Not allowed to edit this team';
  END IF;

  IF p_show_on_home THEN
    UPDATE public.team_updates
    SET show_on_home = false
    WHERE team_id = v_team_id
      AND show_on_home = true
      AND id <> p_update_id;

    UPDATE public.team_updates
    SET show_on_home = true,
        updated_at = now()
    WHERE id = p_update_id
    RETURNING * INTO v_update;
  ELSE
    UPDATE public.team_updates
    SET show_on_home = false,
        updated_at = now()
    WHERE id = p_update_id
    RETURNING * INTO v_update;
  END IF;

  RETURN v_update;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_team_update_show_on_home(uuid, boolean) TO authenticated;
