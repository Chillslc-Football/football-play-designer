-- Phase 2A: built-in messaging channels (everyone, coaches, players, parents).
-- Reuses existing "Team Chat" thread as everyone; seeds missing channels per team.

DO $$
BEGIN
  CREATE TYPE public.team_message_thread_kind AS ENUM (
    'everyone',
    'coaches',
    'players',
    'parents'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

ALTER TABLE public.team_message_threads
  ADD COLUMN IF NOT EXISTS thread_kind public.team_message_thread_kind;

UPDATE public.team_message_threads
SET thread_kind = 'everyone'
WHERE thread_kind IS NULL;

ALTER TABLE public.team_message_threads
  ALTER COLUMN thread_kind SET DEFAULT 'everyone',
  ALTER COLUMN thread_kind SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS team_message_threads_team_id_thread_kind_idx
  ON public.team_message_threads (team_id, thread_kind);

CREATE OR REPLACE FUNCTION public.get_auth_team_member_role(p_team_id uuid)
RETURNS public.team_role
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT tm.role
  FROM public.team_members tm
  WHERE tm.team_id = p_team_id
    AND tm.user_id = auth.uid()
  LIMIT 1;
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
  END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_team_builtin_message_threads(p_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_kind public.team_message_thread_kind;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_team_member(p_team_id) THEN
    RAISE EXCEPTION 'Not a member of this team';
  END IF;

  FOREACH v_kind IN ARRAY ARRAY[
    'everyone'::public.team_message_thread_kind,
    'coaches'::public.team_message_thread_kind,
    'players'::public.team_message_thread_kind,
    'parents'::public.team_message_thread_kind
  ]
  LOOP
    BEGIN
      INSERT INTO public.team_message_threads (team_id, title, thread_kind, created_by)
      VALUES (
        p_team_id,
        public.builtin_message_thread_title(v_kind),
        v_kind,
        auth.uid()
      );
    EXCEPTION
      WHEN unique_violation THEN
        NULL;
    END;
  END LOOP;

  UPDATE public.team_message_threads
  SET thread_kind = 'everyone'
  WHERE team_id = p_team_id
    AND title = 'Team Chat'
    AND thread_kind IS DISTINCT FROM 'everyone';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_or_create_team_chat_thread(p_team_id uuid)
RETURNS public.team_message_threads
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_thread public.team_message_threads;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_team_member(p_team_id) THEN
    RAISE EXCEPTION 'Not a member of this team';
  END IF;

  PERFORM public.ensure_team_builtin_message_threads(p_team_id);

  SELECT *
  INTO v_thread
  FROM public.team_message_threads
  WHERE team_id = p_team_id
    AND thread_kind = 'everyone';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Everyone channel not found for team';
  END IF;

  RETURN v_thread;
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

CREATE OR REPLACE FUNCTION public.mark_thread_read(
  p_thread_id uuid,
  p_up_to_message_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
  v_user_id uuid;
  v_up_to_created_at timestamptz;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT team_id
  INTO v_team_id
  FROM public.team_message_threads
  WHERE id = p_thread_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Thread not found';
  END IF;

  IF NOT public.is_team_member(v_team_id) THEN
    RAISE EXCEPTION 'Not a member of this team';
  END IF;

  IF NOT public.can_access_message_thread(p_thread_id) THEN
    RAISE EXCEPTION 'Not authorized for this channel';
  END IF;

  SELECT created_at
  INTO v_up_to_created_at
  FROM public.team_messages
  WHERE id = p_up_to_message_id
    AND thread_id = p_thread_id
    AND team_id = v_team_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found in thread';
  END IF;

  INSERT INTO public.team_message_reads (team_id, thread_id, message_id, user_id)
  SELECT
    m.team_id,
    m.thread_id,
    m.id,
    v_user_id
  FROM public.team_messages m
  WHERE m.thread_id = p_thread_id
    AND m.team_id = v_team_id
    AND m.deleted_at IS NULL
    AND m.created_at <= v_up_to_created_at
    AND m.sender_id <> v_user_id
  ON CONFLICT (user_id, message_id) DO NOTHING;
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
      AND public.can_access_message_thread_kind(p_team_id, t.thread_kind)
      AND NOT EXISTS (
        SELECT 1
        FROM public.team_message_reads r
        WHERE r.message_id = m.id
          AND r.user_id = v_user_id
      )
  );
END;
$$;

DROP POLICY IF EXISTS "team_message_threads_select_member" ON public.team_message_threads;
CREATE POLICY "team_message_threads_select_member"
  ON public.team_message_threads FOR SELECT
  TO authenticated
  USING (
    public.is_team_member(team_id)
    AND public.can_access_message_thread_kind(team_id, thread_kind)
  );

DROP POLICY IF EXISTS "team_messages_select_member" ON public.team_messages;
CREATE POLICY "team_messages_select_member"
  ON public.team_messages FOR SELECT
  TO authenticated
  USING (
    public.is_team_member(team_id)
    AND public.can_access_message_thread(thread_id)
  );

DROP POLICY IF EXISTS "team_messages_insert_member" ON public.team_messages;
CREATE POLICY "team_messages_insert_member"
  ON public.team_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_team_member(team_id)
    AND sender_id = auth.uid()
    AND public.can_access_message_thread(thread_id)
  );

DROP POLICY IF EXISTS "team_message_reads_select_member" ON public.team_message_reads;
CREATE POLICY "team_message_reads_select_member"
  ON public.team_message_reads FOR SELECT
  TO authenticated
  USING (
    public.is_team_member(team_id)
    AND public.can_access_message_thread(thread_id)
  );

DROP POLICY IF EXISTS "team_message_reads_insert_member" ON public.team_message_reads;
CREATE POLICY "team_message_reads_insert_member"
  ON public.team_message_reads FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_team_member(team_id)
    AND user_id = auth.uid()
    AND public.can_access_message_thread(thread_id)
  );

GRANT EXECUTE ON FUNCTION public.get_auth_team_member_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_message_thread_kind(uuid, public.team_message_thread_kind) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_message_thread(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.builtin_message_thread_title(public.team_message_thread_kind) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_team_builtin_message_threads(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_accessible_team_message_threads(uuid) TO authenticated;
