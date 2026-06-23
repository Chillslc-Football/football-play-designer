-- Phase 4A: one-to-one direct messages (team-scoped, participant-only).
-- Requires 20250622200000_team_message_direct_messages_enum.sql.

DROP INDEX IF EXISTS public.team_message_threads_team_id_thread_kind_idx;

CREATE UNIQUE INDEX IF NOT EXISTS team_message_threads_team_id_builtin_thread_kind_idx
  ON public.team_message_threads (team_id, thread_kind)
  WHERE thread_kind <> 'direct';

CREATE TABLE IF NOT EXISTS public.team_message_thread_participants (
  thread_id uuid NOT NULL REFERENCES public.team_message_threads (id) ON DELETE CASCADE,
  team_id   uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS team_message_thread_participants_team_user_idx
  ON public.team_message_thread_participants (team_id, user_id);

CREATE TABLE IF NOT EXISTS public.team_message_direct_thread_pairs (
  team_id     uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  thread_id   uuid NOT NULL UNIQUE REFERENCES public.team_message_threads (id) ON DELETE CASCADE,
  user_one_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  user_two_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT team_message_direct_thread_pairs_user_order CHECK (user_one_id < user_two_id),
  CONSTRAINT team_message_direct_thread_pairs_distinct_users CHECK (user_one_id <> user_two_id),
  PRIMARY KEY (team_id, user_one_id, user_two_id)
);

CREATE OR REPLACE FUNCTION public.is_direct_message_thread_participant(p_thread_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_message_thread_participants p
    WHERE p.thread_id = p_thread_id
      AND p.user_id = auth.uid()
  );
$$;

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

  IF p_thread_kind = 'direct' THEN
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
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
  v_thread_kind public.team_message_thread_kind;
BEGIN
  SELECT team_id, thread_kind
  INTO v_team_id, v_thread_kind
  FROM public.team_message_threads
  WHERE id = p_thread_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_thread_kind = 'direct' THEN
    RETURN public.is_direct_message_thread_participant(p_thread_id);
  END IF;

  RETURN public.can_access_message_thread_kind(v_team_id, v_thread_kind);
END;
$$;

CREATE OR REPLACE FUNCTION public.builtin_message_thread_title(
  p_thread_kind public.team_message_thread_kind
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_thread_kind
    WHEN 'everyone' THEN 'Team Chat'
    WHEN 'coaches' THEN 'Coaches'
    WHEN 'players' THEN 'Players'
    WHEN 'parents' THEN 'Parents'
    WHEN 'direct' THEN 'Direct Message'
  END;
$$;

CREATE OR REPLACE FUNCTION public.count_eligible_direct_readers(
  p_thread_id uuid,
  p_exclude_user_id uuid
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM public.team_message_thread_participants p
  WHERE p.thread_id = p_thread_id
    AND p.user_id IS DISTINCT FROM p_exclude_user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_message_read_summary(p_message_id uuid)
RETURNS TABLE (
  read_count bigint,
  eligible_count bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
  v_thread_id uuid;
  v_thread_kind public.team_message_thread_kind;
  v_sender_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT m.team_id, m.thread_id, t.thread_kind, m.sender_id
  INTO v_team_id, v_thread_id, v_thread_kind, v_sender_id
  FROM public.team_messages m
  INNER JOIN public.team_message_threads t ON t.id = m.thread_id
  WHERE m.id = p_message_id
    AND m.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  IF NOT public.can_edit_team(v_team_id) THEN
    RAISE EXCEPTION 'Not authorized to view read receipts';
  END IF;

  IF NOT public.can_access_message_thread(v_thread_id) THEN
    RAISE EXCEPTION 'Not authorized for this channel';
  END IF;

  RETURN QUERY
  SELECT
    (
      SELECT COUNT(DISTINCT r.user_id)
      FROM public.team_message_reads r
      WHERE r.message_id = p_message_id
    ) AS read_count,
    CASE
      WHEN v_thread_kind = 'direct' THEN
        public.count_eligible_direct_readers(v_thread_id, v_sender_id)
      ELSE
        public.count_eligible_channel_readers(v_team_id, v_thread_kind, v_sender_id)
    END AS eligible_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_team_message_unread_count(p_team_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY INVOKER
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

  RETURN (
    SELECT COUNT(*)
    FROM public.team_messages m
    INNER JOIN public.team_message_threads t ON t.id = m.thread_id
    WHERE m.team_id = p_team_id
      AND m.deleted_at IS NULL
      AND m.sender_id <> v_user_id
      AND public.can_access_message_thread(t.id)
      AND NOT EXISTS (
        SELECT 1
        FROM public.team_message_reads r
        WHERE r.message_id = m.id
          AND r.user_id = v_user_id
      )
  );
END;
$$;

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
SECURITY INVOKER
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
    AND public.can_access_message_thread_kind(p_team_id, t.thread_kind)
  ORDER BY
    CASE t.thread_kind
      WHEN 'everyone' THEN 1
      WHEN 'coaches' THEN 2
      WHEN 'players' THEN 3
      WHEN 'parents' THEN 4
      ELSE 5
    END,
    t.title;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_dm_eligible_members(p_team_id uuid)
RETURNS TABLE (
  user_id uuid,
  role public.team_role,
  display_name text
)
LANGUAGE plpgsql
SECURITY INVOKER
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

  RETURN QUERY
  SELECT
    tm.user_id,
    tm.role,
    p.display_name
  FROM public.team_members tm
  LEFT JOIN public.profiles p ON p.id = tm.user_id
  WHERE tm.team_id = p_team_id
    AND tm.user_id <> v_user_id
  ORDER BY
    COALESCE(NULLIF(trim(p.display_name), ''), 'zzzz'),
    tm.user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_direct_message_threads(p_team_id uuid)
RETURNS TABLE (
  id uuid,
  team_id uuid,
  title text,
  thread_kind public.team_message_thread_kind,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  last_message_at timestamptz,
  unread_count bigint,
  other_user_id uuid,
  other_display_name text
)
LANGUAGE plpgsql
SECURITY INVOKER
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

  RETURN QUERY
  SELECT
    t.id,
    t.team_id,
    COALESCE(NULLIF(trim(p.display_name), ''), 'Team member') AS title,
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
    ) AS unread_count,
    other_participant.user_id AS other_user_id,
    p.display_name AS other_display_name
  FROM public.team_message_threads t
  INNER JOIN public.team_message_thread_participants self_participant
    ON self_participant.thread_id = t.id
    AND self_participant.user_id = v_user_id
  INNER JOIN public.team_message_thread_participants other_participant
    ON other_participant.thread_id = t.id
    AND other_participant.user_id <> v_user_id
  LEFT JOIN public.profiles p ON p.id = other_participant.user_id
  WHERE t.team_id = p_team_id
    AND t.thread_kind = 'direct'
  ORDER BY t.last_message_at DESC NULLS LAST, t.updated_at DESC, t.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_or_create_direct_message_thread(
  p_team_id uuid,
  p_target_user_id uuid
)
RETURNS public.team_message_threads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_thread public.team_message_threads;
  v_user_one uuid;
  v_user_two uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_target_user_id IS NULL OR p_target_user_id = v_user_id THEN
    RAISE EXCEPTION 'Invalid direct message target';
  END IF;

  IF NOT public.is_team_member(p_team_id) THEN
    RAISE EXCEPTION 'Not a member of this team';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.team_id = p_team_id
      AND tm.user_id = p_target_user_id
  ) THEN
    RAISE EXCEPTION 'Target is not a member of this team';
  END IF;

  v_user_one := LEAST(v_user_id, p_target_user_id);
  v_user_two := GREATEST(v_user_id, p_target_user_id);

  SELECT t.*
  INTO v_thread
  FROM public.team_message_direct_thread_pairs pair
  INNER JOIN public.team_message_threads t ON t.id = pair.thread_id
  WHERE pair.team_id = p_team_id
    AND pair.user_one_id = v_user_one
    AND pair.user_two_id = v_user_two;

  IF FOUND THEN
    RETURN v_thread;
  END IF;

  INSERT INTO public.team_message_threads (team_id, title, thread_kind, created_by)
  VALUES (
    p_team_id,
    'DM ' || v_user_one::text || ':' || v_user_two::text,
    'direct',
    v_user_id
  )
  RETURNING * INTO v_thread;

  INSERT INTO public.team_message_thread_participants (thread_id, team_id, user_id)
  VALUES
    (v_thread.id, p_team_id, v_user_id),
    (v_thread.id, p_team_id, p_target_user_id);

  INSERT INTO public.team_message_direct_thread_pairs (
    team_id,
    thread_id,
    user_one_id,
    user_two_id
  )
  VALUES (p_team_id, v_thread.id, v_user_one, v_user_two);

  RETURN v_thread;
END;
$$;

ALTER TABLE public.team_message_thread_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_message_thread_participants_select_self" ON public.team_message_thread_participants;
CREATE POLICY "team_message_thread_participants_select_self"
  ON public.team_message_thread_participants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND public.is_team_member(team_id)
  );

ALTER TABLE public.team_message_direct_thread_pairs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_message_threads_select_member" ON public.team_message_threads;
CREATE POLICY "team_message_threads_select_member"
  ON public.team_message_threads FOR SELECT
  TO authenticated
  USING (
    public.is_team_member(team_id)
    AND public.can_access_message_thread(id)
  );

DROP POLICY IF EXISTS "team_message_threads_insert_member" ON public.team_message_threads;
CREATE POLICY "team_message_threads_insert_member"
  ON public.team_message_threads FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_team_member(team_id)
    AND created_by = auth.uid()
    AND thread_kind <> 'direct'
  );

GRANT EXECUTE ON FUNCTION public.is_direct_message_thread_participant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_eligible_direct_readers(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_dm_eligible_members(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_direct_message_threads(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_message_thread(uuid, uuid) TO authenticated;
