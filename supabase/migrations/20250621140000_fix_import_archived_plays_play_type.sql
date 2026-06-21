-- Fix import_archived_plays: cast archived text play_type to public.play_type enum.

CREATE OR REPLACE FUNCTION public.import_archived_plays(
  p_archived_play_ids uuid[],
  p_target_team_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_target_format text;
  v_rec record;
  v_new_id uuid;
  v_name text;
  v_data jsonb;
  v_imported integer := 0;
  v_requested integer;
  v_accessible integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_archived_play_ids IS NULL OR array_length(p_archived_play_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  v_requested := array_length(p_archived_play_ids, 1);

  IF NOT public.can_edit_team(p_target_team_id) THEN
    RAISE EXCEPTION 'Not authorized to import into this team';
  END IF;

  SELECT COALESCE(NULLIF(trim(t.team_format::text), ''), '11v11')
  INTO v_target_format
  FROM public.teams AS t
  WHERE t.id = p_target_team_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  SELECT count(*)
  INTO v_accessible
  FROM public.archived_plays AS ap
  WHERE ap.id = ANY(p_archived_play_ids)
    AND ap.archived_by = v_user_id;

  IF v_accessible <> v_requested THEN
    RAISE EXCEPTION 'One or more archived plays were not found or not accessible';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.archived_plays AS ap
    WHERE ap.id = ANY(p_archived_play_ids)
      AND ap.archived_by = v_user_id
      AND COALESCE(NULLIF(trim(ap.team_format), ''), '11v11') <> v_target_format
  ) THEN
    RAISE EXCEPTION
      'Format mismatch: one or more archived plays cannot be imported into a % team',
      v_target_format;
  END IF;

  FOR v_rec IN
    SELECT ap.*
    FROM public.archived_plays AS ap
    WHERE ap.id = ANY(p_archived_play_ids)
      AND ap.archived_by = v_user_id
    ORDER BY ap.archived_at ASC, ap.name ASC
  LOOP
    v_name := public.resolve_import_asset_name(p_target_team_id, 'plays', v_rec.name);
    v_new_id := gen_random_uuid();
    v_data := v_rec.data;
    v_data := jsonb_set(v_data, '{id}', to_jsonb(v_new_id::text), true);
    v_data := jsonb_set(v_data, '{name}', to_jsonb(v_name), true);

    INSERT INTO public.plays (
      id,
      team_id,
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
      created_by,
      updated_by
    )
    VALUES (
      v_new_id,
      p_target_team_id,
      v_name,
      v_rec.play_type::public.play_type,
      v_rec.formation_id,
      v_rec.formation_name,
      v_rec.front_id,
      v_rec.front_name,
      v_rec.opponent_formation_id,
      v_rec.opponent_formation_name,
      v_rec.categories,
      v_data,
      v_user_id,
      v_user_id
    );

    v_imported := v_imported + 1;
  END LOOP;

  RETURN v_imported;
END;
$$;

GRANT EXECUTE ON FUNCTION public.import_archived_plays(uuid[], uuid) TO authenticated;
