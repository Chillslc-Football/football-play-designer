-- Drop legacy create_team(text) so team format is always persisted via create_team(text, team_format).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_format') THEN
    CREATE TYPE public.team_format AS ENUM ('11v11', '8v8', '7v7');
  END IF;
END
$$;

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS team_format public.team_format NOT NULL DEFAULT '11v11';

DROP FUNCTION IF EXISTS public.create_team(text);

CREATE OR REPLACE FUNCTION public.create_team(
  p_name text,
  p_team_format public.team_format DEFAULT '11v11'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF trim(p_name) IS NULL OR length(trim(p_name)) < 2 THEN
    RAISE EXCEPTION 'Team name must be at least 2 characters';
  END IF;

  IF p_team_format NOT IN ('11v11', '8v8', '7v7') THEN
    RAISE EXCEPTION 'Invalid team format';
  END IF;

  INSERT INTO public.teams (name, created_by, team_format)
  VALUES (trim(p_name), auth.uid(), p_team_format)
  RETURNING id INTO v_team_id;

  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_team_id, auth.uid(), 'team_owner');

  UPDATE public.profiles
  SET last_team_id = v_team_id
  WHERE id = auth.uid();

  RETURN v_team_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_team(text, public.team_format) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_team(text, public.team_format) TO authenticated;
