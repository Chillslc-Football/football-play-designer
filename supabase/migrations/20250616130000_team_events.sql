-- Team calendar events visible to all team members; editors can manage.
-- Apply in Supabase SQL editor before testing Calendar in the app.

CREATE TABLE IF NOT EXISTS public.team_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  title       text NOT NULL CHECK (char_length(trim(title)) > 0),
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz NOT NULL,
  location    text,
  description text,
  created_by  uuid REFERENCES auth.users (id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_events_ends_after_start CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS team_events_team_id_starts_at_idx
  ON public.team_events (team_id, starts_at);

CREATE INDEX IF NOT EXISTS team_events_team_id_ends_at_idx
  ON public.team_events (team_id, ends_at);

ALTER TABLE public.team_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_events_select_member" ON public.team_events;
CREATE POLICY "team_events_select_member"
  ON public.team_events FOR SELECT
  TO authenticated
  USING (public.is_team_member(team_id));

DROP POLICY IF EXISTS "team_events_insert_editors" ON public.team_events;
CREATE POLICY "team_events_insert_editors"
  ON public.team_events FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_edit_team(team_id)
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "team_events_update_editors" ON public.team_events;
CREATE POLICY "team_events_update_editors"
  ON public.team_events FOR UPDATE
  TO authenticated
  USING (public.can_edit_team(team_id))
  WITH CHECK (public.can_edit_team(team_id));

DROP POLICY IF EXISTS "team_events_delete_editors" ON public.team_events;
CREATE POLICY "team_events_delete_editors"
  ON public.team_events FOR DELETE
  TO authenticated
  USING (public.can_edit_team(team_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_events TO authenticated;
