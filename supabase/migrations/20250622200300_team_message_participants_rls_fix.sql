-- Fix infinite recursion in team_message_thread_participants RLS.
-- The co-participant policy subqueried the same table under RLS, which recursed.
-- Use SECURITY DEFINER membership check instead (no table self-reference in policy).

CREATE OR REPLACE FUNCTION public.is_direct_message_thread_participant(p_thread_id uuid)
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
      AND p.user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "team_message_thread_participants_select_co_participant"
  ON public.team_message_thread_participants;

DROP POLICY IF EXISTS "team_message_thread_participants_select_self"
  ON public.team_message_thread_participants;

CREATE POLICY "team_message_thread_participants_select_co_participant"
  ON public.team_message_thread_participants FOR SELECT
  TO authenticated
  USING (
    public.is_team_member(team_id)
    AND public.is_direct_message_thread_participant(thread_id)
  );

GRANT SELECT ON TABLE public.team_message_thread_participants TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_direct_message_thread_participant(uuid) TO authenticated;
