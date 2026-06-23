-- Fix DM list: table GRANT + co-participant SELECT policy for 1:1 threads.
-- Root cause: missing GRANT SELECT on team_message_thread_participants, and the
-- self-only RLS policy blocked list_direct_message_threads from joining the
-- other participant row (even though that RPC is SECURITY INVOKER).

GRANT SELECT ON TABLE public.team_message_thread_participants TO authenticated;

DROP POLICY IF EXISTS "team_message_thread_participants_select_self"
  ON public.team_message_thread_participants;

CREATE POLICY "team_message_thread_participants_select_co_participant"
  ON public.team_message_thread_participants FOR SELECT
  TO authenticated
  USING (
    public.is_team_member(team_id)
    AND thread_id IN (
      SELECT p.thread_id
      FROM public.team_message_thread_participants p
      WHERE p.user_id = auth.uid()
    )
  );
