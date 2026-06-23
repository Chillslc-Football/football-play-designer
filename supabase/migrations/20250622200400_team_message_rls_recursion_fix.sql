-- Break RLS recursion loop:
-- team_message_threads policy -> can_access_message_thread(id)
--   -> SELECT team_message_threads -> policy -> can_access_message_thread(id) ...
-- Also simplify participant SELECT to self-only; use DEFINER RPCs for co-participant reads.

CREATE OR REPLACE FUNCTION public.is_direct_message_participant_unchecked(
  p_thread_id uuid,
  p_user_id uuid
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
    WHERE p.thread_id = p_thread_id
      AND p.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_direct_message_thread_participant(p_thread_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_direct_message_participant_unchecked(p_thread_id, auth.uid());
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

  RETURN public.can_access_message_thread_kind(v_team_id, v_thread_kind);
END;
$$;

CREATE OR REPLACE FUNCTION public.count_eligible_direct_readers(
  p_thread_id uuid,
  p_exclude_user_id uuid
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM public.team_message_thread_participants p
  WHERE p.thread_id = p_thread_id
    AND p.user_id IS DISTINCT FROM p_exclude_user_id;
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

DROP POLICY IF EXISTS "team_message_thread_participants_select_co_participant"
  ON public.team_message_thread_participants;

DROP POLICY IF EXISTS "team_message_thread_participants_select_self"
  ON public.team_message_thread_participants;

CREATE POLICY "team_message_thread_participants_select_self"
  ON public.team_message_thread_participants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND public.is_team_member(team_id)
  );

GRANT EXECUTE ON FUNCTION public.is_direct_message_participant_unchecked(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_direct_message_thread_participant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_message_thread(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_eligible_direct_readers(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_direct_message_threads(uuid) TO authenticated;
