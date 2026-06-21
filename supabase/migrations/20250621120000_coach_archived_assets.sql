-- Phase 1: Coach archived assets on team deletion (production-safe).
--
-- Paste into Supabase SQL Editor and run as one script.
--
-- Prerequisites verified before any DDL runs:
--   Tables:  public.teams, public.plays, public.custom_formations, public.profiles
--   Function: public.is_team_owner(uuid)  (existing team delete flow)
--
-- Production notes:
--   - team_format is TEXT (not an enum)
--   - No dependency on public.is_app_admin()
--   - Archive first, delete second; abort team delete if archive fails

-- ---------------------------------------------------------------------------
-- Preflight: fail fast with a clear message if anything required is missing
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_missing text[] := ARRAY[]::text[];
BEGIN
  IF to_regclass('public.teams') IS NULL THEN
    v_missing := array_append(v_missing, 'table public.teams');
  END IF;

  IF to_regclass('public.plays') IS NULL THEN
    v_missing := array_append(v_missing, 'table public.plays');
  END IF;

  IF to_regclass('public.custom_formations') IS NULL THEN
    v_missing := array_append(v_missing, 'table public.custom_formations');
  END IF;

  IF to_regclass('public.profiles') IS NULL THEN
    v_missing := array_append(v_missing, 'table public.profiles');
  END IF;

  IF to_regprocedure('public.is_team_owner(uuid)') IS NULL THEN
    v_missing := array_append(v_missing, 'function public.is_team_owner(uuid)');
  END IF;

  IF to_regclass('public.teams') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'id'
    ) THEN
      v_missing := array_append(v_missing, 'column teams.id');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'name'
    ) THEN
      v_missing := array_append(v_missing, 'column teams.name');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'team_format'
    ) THEN
      v_missing := array_append(v_missing, 'column teams.team_format');
    END IF;
  END IF;

  IF to_regclass('public.plays') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'plays' AND column_name = 'id'
    ) THEN
      v_missing := array_append(v_missing, 'column plays.id');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'plays' AND column_name = 'team_id'
    ) THEN
      v_missing := array_append(v_missing, 'column plays.team_id');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'plays' AND column_name = 'name'
    ) THEN
      v_missing := array_append(v_missing, 'column plays.name');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'plays' AND column_name = 'play_type'
    ) THEN
      v_missing := array_append(v_missing, 'column plays.play_type');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'plays' AND column_name = 'data'
    ) THEN
      v_missing := array_append(v_missing, 'column plays.data');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'plays' AND column_name = 'formation_id'
    ) THEN
      v_missing := array_append(v_missing, 'column plays.formation_id');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'plays' AND column_name = 'formation_name'
    ) THEN
      v_missing := array_append(v_missing, 'column plays.formation_name');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'plays' AND column_name = 'front_id'
    ) THEN
      v_missing := array_append(v_missing, 'column plays.front_id (apply 20250608130000_add_play_front_columns.sql)');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'plays' AND column_name = 'front_name'
    ) THEN
      v_missing := array_append(v_missing, 'column plays.front_name (apply 20250608130000_add_play_front_columns.sql)');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'plays' AND column_name = 'opponent_formation_id'
    ) THEN
      v_missing := array_append(v_missing, 'column plays.opponent_formation_id (apply 20250608130000_add_play_front_columns.sql)');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'plays' AND column_name = 'opponent_formation_name'
    ) THEN
      v_missing := array_append(v_missing, 'column plays.opponent_formation_name (apply 20250608130000_add_play_front_columns.sql)');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'plays' AND column_name = 'categories'
    ) THEN
      v_missing := array_append(v_missing, 'column plays.categories (apply 20250608120000_add_play_categories.sql)');
    END IF;
  END IF;

  IF to_regclass('public.custom_formations') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'custom_formations' AND column_name = 'id'
    ) THEN
      v_missing := array_append(v_missing, 'column custom_formations.id');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'custom_formations' AND column_name = 'team_id'
    ) THEN
      v_missing := array_append(v_missing, 'column custom_formations.team_id');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'custom_formations' AND column_name = 'name'
    ) THEN
      v_missing := array_append(v_missing, 'column custom_formations.name');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'custom_formations' AND column_name = 'data'
    ) THEN
      v_missing := array_append(v_missing, 'column custom_formations.data');
    END IF;
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_team_id'
    ) THEN
      v_missing := array_append(v_missing, 'column profiles.last_team_id');
    END IF;
  END IF;

  IF coalesce(array_length(v_missing, 1), 0) > 0 THEN
    RAISE EXCEPTION 'Archive migration preflight failed. Missing: %', array_to_string(v_missing, '; ');
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Archive header: one row per team deletion event
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.archived_teams (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_team_id    uuid NOT NULL,
  original_team_name  text NOT NULL,
  team_format         text NOT NULL DEFAULT '11v11',
  archived_by         uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  archived_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS archived_teams_archived_by_idx
  ON public.archived_teams (archived_by, archived_at DESC);

COMMENT ON TABLE public.archived_teams IS
  'Snapshot header created when a team_owner deletes a team. Links archived plays and formations.';

-- ---------------------------------------------------------------------------
-- Archived plays
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.archived_plays (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_id                  uuid NOT NULL REFERENCES public.archived_teams (id) ON DELETE CASCADE,
  original_id                 uuid NOT NULL,
  original_team_id            uuid NOT NULL,
  original_team_name          text NOT NULL,
  team_format                 text NOT NULL DEFAULT '11v11',
  archived_by                 uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  archived_at                 timestamptz NOT NULL DEFAULT now(),
  name                        text NOT NULL,
  play_type                   text NOT NULL,
  formation_id                text NOT NULL DEFAULT '',
  formation_name              text NOT NULL DEFAULT '',
  front_id                    text,
  front_name                  text,
  opponent_formation_id       text,
  opponent_formation_name     text,
  categories                  text[] NOT NULL DEFAULT '{}',
  data                        jsonb NOT NULL,
  original_created_by         uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  original_updated_by         uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  original_created_at         timestamptz,
  original_updated_at         timestamptz
);

CREATE INDEX IF NOT EXISTS archived_plays_archive_id_idx
  ON public.archived_plays (archive_id);

CREATE INDEX IF NOT EXISTS archived_plays_archived_by_idx
  ON public.archived_plays (archived_by, archived_at DESC);

CREATE INDEX IF NOT EXISTS archived_plays_original_team_id_idx
  ON public.archived_plays (original_team_id);

COMMENT ON TABLE public.archived_plays IS
  'Coach play copies preserved before team deletion. Imports later are copies, not moves.';

-- ---------------------------------------------------------------------------
-- Archived custom formations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.archived_custom_formations (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_id                  uuid NOT NULL REFERENCES public.archived_teams (id) ON DELETE CASCADE,
  original_id                 uuid NOT NULL,
  original_team_id            uuid NOT NULL,
  original_team_name          text NOT NULL,
  team_format                 text NOT NULL DEFAULT '11v11',
  archived_by                 uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  archived_at                 timestamptz NOT NULL DEFAULT now(),
  name                        text NOT NULL,
  data                        jsonb NOT NULL,
  original_created_by         uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  original_updated_by         uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  original_created_at         timestamptz,
  original_updated_at         timestamptz
);

CREATE INDEX IF NOT EXISTS archived_custom_formations_archive_id_idx
  ON public.archived_custom_formations (archive_id);

CREATE INDEX IF NOT EXISTS archived_custom_formations_archived_by_idx
  ON public.archived_custom_formations (archived_by, archived_at DESC);

CREATE INDEX IF NOT EXISTS archived_custom_formations_original_team_id_idx
  ON public.archived_custom_formations (original_team_id);

COMMENT ON TABLE public.archived_custom_formations IS
  'Coach custom formation copies preserved before team deletion.';

-- ---------------------------------------------------------------------------
-- RLS: owner-only read; no client writes (inserts via SECURITY DEFINER RPC)
-- ---------------------------------------------------------------------------

ALTER TABLE public.archived_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_custom_formations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS archived_teams_select_owner ON public.archived_teams;
CREATE POLICY archived_teams_select_owner
  ON public.archived_teams FOR SELECT
  TO authenticated
  USING (archived_by = auth.uid());

DROP POLICY IF EXISTS archived_plays_select_owner ON public.archived_plays;
CREATE POLICY archived_plays_select_owner
  ON public.archived_plays FOR SELECT
  TO authenticated
  USING (archived_by = auth.uid());

DROP POLICY IF EXISTS archived_custom_formations_select_owner ON public.archived_custom_formations;
CREATE POLICY archived_custom_formations_select_owner
  ON public.archived_custom_formations FOR SELECT
  TO authenticated
  USING (archived_by = auth.uid());

GRANT SELECT ON public.archived_teams TO authenticated;
GRANT SELECT ON public.archived_plays TO authenticated;
GRANT SELECT ON public.archived_custom_formations TO authenticated;

-- ---------------------------------------------------------------------------
-- delete_team: archive coach assets, then delete team (transactional)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_team(p_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_name     text;
  v_team_format   text;
  v_archive_id    uuid;
  v_archived_by   uuid := auth.uid();
BEGIN
  IF v_archived_by IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_team_owner(p_team_id) THEN
    RAISE EXCEPTION 'Only team owners can delete teams';
  END IF;

  SELECT
    t.name,
    COALESCE(NULLIF(trim(t.team_format::text), ''), '11v11')
  INTO v_team_name, v_team_format
  FROM public.teams AS t
  WHERE t.id = p_team_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  INSERT INTO public.archived_teams (
    original_team_id,
    original_team_name,
    team_format,
    archived_by
  )
  VALUES (
    p_team_id,
    v_team_name,
    v_team_format,
    v_archived_by
  )
  RETURNING id INTO v_archive_id;

  INSERT INTO public.archived_plays (
    archive_id,
    original_id,
    original_team_id,
    original_team_name,
    team_format,
    archived_by,
    name,
    play_type,
    formation_id,
    formation_name,
    front_id,
    front_name,
    opponent_formation_id,
    opponent_formation_name,
    categories,
    data,
    original_created_by,
    original_updated_by,
    original_created_at,
    original_updated_at
  )
  SELECT
    v_archive_id,
    p.id,
    p.team_id,
    v_team_name,
    v_team_format,
    v_archived_by,
    p.name,
    p.play_type::text,
    COALESCE(p.formation_id, ''),
    COALESCE(p.formation_name, ''),
    p.front_id,
    p.front_name,
    p.opponent_formation_id,
    p.opponent_formation_name,
    COALESCE(p.categories, '{}'::text[]),
    p.data,
    p.created_by,
    p.updated_by,
    p.created_at,
    p.updated_at
  FROM public.plays AS p
  WHERE p.team_id = p_team_id;

  INSERT INTO public.archived_custom_formations (
    archive_id,
    original_id,
    original_team_id,
    original_team_name,
    team_format,
    archived_by,
    name,
    data,
    original_created_by,
    original_updated_by,
    original_created_at,
    original_updated_at
  )
  SELECT
    v_archive_id,
    cf.id,
    cf.team_id,
    v_team_name,
    v_team_format,
    v_archived_by,
    cf.name,
    cf.data,
    cf.created_by,
    cf.updated_by,
    cf.created_at,
    cf.updated_at
  FROM public.custom_formations AS cf
  WHERE cf.team_id = p_team_id;

  -- Custom fronts: only when both live and archive tables exist.
  IF to_regclass('public.custom_fronts') IS NOT NULL
     AND to_regclass('public.archived_custom_fronts') IS NOT NULL THEN
    EXECUTE $archive_fronts$
      INSERT INTO public.archived_custom_fronts (
        archive_id,
        original_id,
        original_team_id,
        original_team_name,
        team_format,
        archived_by,
        name,
        data,
        original_created_by,
        original_updated_by,
        original_created_at,
        original_updated_at
      )
      SELECT
        $1,
        cf.id,
        cf.team_id,
        $2,
        $3,
        $4,
        cf.name,
        cf.data,
        cf.created_by,
        cf.updated_by,
        cf.created_at,
        cf.updated_at
      FROM public.custom_fronts AS cf
      WHERE cf.team_id = $5
    $archive_fronts$
    USING v_archive_id, v_team_name, v_team_format, v_archived_by, p_team_id;
  END IF;

  UPDATE public.profiles
  SET last_team_id = NULL
  WHERE last_team_id = p_team_id;

  DELETE FROM public.teams
  WHERE id = p_team_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_team(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Post-apply verification (optional — safe to run; raises if incomplete)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.archived_teams') IS NULL
     OR to_regclass('public.archived_plays') IS NULL
     OR to_regclass('public.archived_custom_formations') IS NULL THEN
    RAISE EXCEPTION 'Archive tables were not created';
  END IF;

  IF to_regprocedure('public.delete_team(uuid)') IS NULL THEN
    RAISE EXCEPTION 'delete_team function was not created';
  END IF;
END
$$;
