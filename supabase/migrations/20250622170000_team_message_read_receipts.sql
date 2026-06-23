-- Phase 3A: coach-focused read receipt summary RPCs.

CREATE INDEX IF NOT EXISTS team_message_reads_message_id_idx
  ON public.team_message_reads (message_id);

CREATE OR REPLACE FUNCTION public.count_eligible_channel_readers(
  p_team_id uuid,
  p_thread_kind public.team_message_thread_kind,
  p_exclude_user_id uuid
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM public.team_members tm
  WHERE tm.team_id = p_team_id
    AND tm.user_id IS DISTINCT FROM p_exclude_user_id
    AND (
      tm.role IN ('team_owner', 'coach')
      OR (tm.role = 'player' AND p_thread_kind IN ('everyone', 'players'))
      OR (tm.role = 'parent' AND p_thread_kind IN ('everyone', 'parents'))
    );
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
    public.count_eligible_channel_readers(v_team_id, v_thread_kind, v_sender_id) AS eligible_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_thread_latest_read_summary(p_thread_id uuid)
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
  v_message_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT team_id
  INTO v_team_id
  FROM public.team_message_threads
  WHERE id = p_thread_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Thread not found';
  END IF;

  IF NOT public.can_edit_team(v_team_id) THEN
    RAISE EXCEPTION 'Not authorized to view read receipts';
  END IF;

  IF NOT public.can_access_message_thread(p_thread_id) THEN
    RAISE EXCEPTION 'Not authorized for this channel';
  END IF;

  SELECT m.id
  INTO v_message_id
  FROM public.team_messages m
  WHERE m.thread_id = p_thread_id
    AND m.team_id = v_team_id
    AND m.deleted_at IS NULL
  ORDER BY m.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT summary.read_count, summary.eligible_count
  FROM public.get_message_read_summary(v_message_id) AS summary;
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_eligible_channel_readers(uuid, public.team_message_thread_kind, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_message_read_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_thread_latest_read_summary(uuid) TO authenticated;
