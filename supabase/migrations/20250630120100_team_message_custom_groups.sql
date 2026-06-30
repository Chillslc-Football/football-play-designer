-- Custom group messaging for Winner's Choice Mobile.
-- Requires 20250630120000_team_message_custom_groups_enum.sql applied first.
--
-- Prerequisites (from FootballPlayDesigner base migrations):
--   - public.team_message_thread_kind enum
--   - public.team_message_threads, team_messages, team_message_reads
--   - public.team_message_thread_participants (DM membership; reused for custom groups)
--   - public.can_access_message_thread, list_accessible_team_message_threads, etc.
--
-- Push notifications: after applying, update the team-message edge function so
-- thread_kind = 'custom' fans out to thread participants (same as direct messages).
-- Existing thread kinds are unchanged.

-- ---------------------------------------------------------------------------
-- 1. Allow multiple custom threads per team (keep one row per built-in kind)
-- ---------------------------------------------------------------------------

DROP INDEX IF EXISTS public.team_message_threads_team_id_builtin_thread_kind_idx;

CREATE UNIQUE INDEX IF NOT EXISTS team_message_threads_team_id_builtin_thread_kind_idx
  ON public.team_message_threads (team_id, thread_kind)
  WHERE thread_kind IN ('everyone', 'coaches', 'players', 'parents');

-- ---------------------------------------------------------------------------
-- 2. Membership helpers (team_message_thread_participants = thread members)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_custom_group_thread_member(
  p_thread_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_message_thread_participants p
    INNER JOIN public.team_message_threads t ON t.id = p.thread_id
    WHERE p.thread_id = p_thread_id
      AND p.user_id = p_user_id
      AND t.thread_kind = 'custom'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_custom_group_thread_member_checked(p_thread_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_custom_group_thread_member(p_thread_id, auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- 3. Thread access: custom groups are participant-only
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_access_message_thread_kind(
  p_team_id uuid,
  p_thread_kind public.team_message_thread_kind
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.team_role;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_team_member(p_team_id) THEN
    RETURN false;
  END IF;

  IF p_thread_kind IN ('direct', 'custom') THEN
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

CREATE OR REPLACE FUNCTION public.can_access_message_thread(p_thread_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
  v_thread_kind public.team_message_thread_kind;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT team_id, thread_kind
  INTO v_team_id, v_thread_kind
  FROM public.team_message_threads
  WHERE id = p_thread_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF NOT public.is_team_member(v_team_id) THEN
    RETURN false;
  END IF;

  IF v_thread_kind = 'direct' THEN
    RETURN public.is_direct_message_participant_unchecked(p_thread_id, auth.uid());
  END IF;

  IF v_thread_kind = 'custom' THEN
    RETURN public.is_custom_group_thread_member(p_thread_id, auth.uid());
  END IF;

  RETURN public.can_access_message_thread_kind(v_team_id, v_thread_kind);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Create custom group RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_custom_group_thread(
  p_team_id uuid,
  p_name text,
  p_member_ids uuid[]
)
RETURNS public.team_message_threads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_name text;
  v_thread public.team_message_threads;
  v_member_id uuid;
  v_distinct_members uuid[];
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_team_member(p_team_id) THEN
    RAISE EXCEPTION 'Not a member of this team';
  END IF;

  v_name := trim(p_name);

  IF char_length(v_name) = 0 THEN
    RAISE EXCEPTION 'Group name is required';
  END IF;

  IF char_length(v_name) > 80 THEN
    RAISE EXCEPTION 'Group name is too long';
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT member_id
    FROM unnest(array_append(coalesce(p_member_ids, ARRAY[]::uuid[]), v_user_id)) AS member_id
  )
  INTO v_distinct_members;

  IF coalesce(array_length(v_distinct_members, 1), 0) < 2 THEN
    RAISE EXCEPTION 'Select at least one other team member';
  END IF;

  FOREACH v_member_id IN ARRAY v_distinct_members LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.team_id = p_team_id
        AND tm.user_id = v_member_id
    ) THEN
      RAISE EXCEPTION 'All group members must belong to this team';
    END IF;
  END LOOP;

  INSERT INTO public.team_message_threads (team_id, title, thread_kind, created_by)
  VALUES (p_team_id, v_name, 'custom', v_user_id)
  RETURNING * INTO v_thread;

  FOREACH v_member_id IN ARRAY v_distinct_members LOOP
    INSERT INTO public.team_message_thread_participants (thread_id, team_id, user_id)
    VALUES (v_thread.id, p_team_id, v_member_id)
    ON CONFLICT (thread_id, user_id) DO NOTHING;
  END LOOP;

  RETURN v_thread;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. List accessible channel threads: Team Chat + custom groups (+ role channels)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_accessible_team_message_threads(p_team_id uuid)
RETURNS TABLE (
  id uuid,
  team_id uuid,
  title text,
  thread_kind public.team_message_thread_kind,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  last_message_at timestamptz,
  unread_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_team_member(p_team_id) THEN
    RAISE EXCEPTION 'Not a member of this team';
  END IF;

  PERFORM public.ensure_team_builtin_message_threads(p_team_id);

  RETURN QUERY
  SELECT
    t.id,
    t.team_id,
    t.title,
    t.thread_kind,
    t.created_by,
    t.created_at,
    t.updated_at,
    t.last_message_at,
    (
      SELECT COUNT(*)
      FROM public.team_messages m
      WHERE m.thread_id = t.id
        AND m.team_id = p_team_id
        AND m.deleted_at IS NULL
        AND m.sender_id <> v_user_id
        AND NOT EXISTS (
          SELECT 1
          FROM public.team_message_reads r
          WHERE r.message_id = m.id
            AND r.user_id = v_user_id
        )
    ) AS unread_count
  FROM public.team_message_threads t
  WHERE t.team_id = p_team_id
    AND t.thread_kind <> 'direct'
    AND (
      public.can_access_message_thread_kind(p_team_id, t.thread_kind)
      OR (
        t.thread_kind = 'custom'
        AND public.is_custom_group_thread_member(t.id, v_user_id)
      )
    )
  ORDER BY
    CASE t.thread_kind
      WHEN 'everyone' THEN 1
      WHEN 'custom' THEN 2
      WHEN 'coaches' THEN 3
      WHEN 'players' THEN 4
      WHEN 'parents' THEN 5
      ELSE 6
    END,
    t.title;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. RLS: custom threads visible only to participants
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "team_message_threads_select_member" ON public.team_message_threads;

CREATE POLICY "team_message_threads_select_member"
  ON public.team_message_threads FOR SELECT
  TO authenticated
  USING (public.can_access_message_thread(id));

DROP POLICY IF EXISTS "team_message_thread_participants_select_self"
  ON public.team_message_thread_participants;

CREATE POLICY "team_message_thread_participants_select_self"
  ON public.team_message_thread_participants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND public.is_team_member(team_id)
  );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.is_custom_group_thread_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_custom_group_thread_member_checked(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_custom_group_thread(uuid, text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_message_thread_kind(uuid, public.team_message_thread_kind) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_message_thread(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_accessible_team_message_threads(uuid) TO authenticated;

-- Refresh PostgREST schema cache so create_custom_group_thread is callable via RPC.
NOTIFY pgrst, 'reload schema';
