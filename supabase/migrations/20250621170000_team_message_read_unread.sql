-- Team message read receipts and unread count RPCs.
-- Uses existing team_message_reads table from 20250615140000_team_messaging.sql.

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

  RETURN (
    SELECT COUNT(*)
    FROM public.team_messages m
    WHERE m.team_id = p_team_id
      AND m.deleted_at IS NULL
      AND m.sender_id <> v_user_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.team_message_reads r
        WHERE r.message_id = m.id
          AND r.user_id = v_user_id
      )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_thread_read(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_message_unread_count(uuid) TO authenticated;
