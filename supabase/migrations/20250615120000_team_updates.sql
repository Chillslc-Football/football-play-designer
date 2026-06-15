-- Team announcements / updates visible to all team members; editors can manage.
-- Apply in Supabase SQL editor before testing Team Updates in the app.

CREATE TABLE IF NOT EXISTS public.team_updates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  title       text NOT NULL CHECK (char_length(trim(title)) > 0),
  body        text NOT NULL CHECK (char_length(trim(body)) > 0),
  update_type text NOT NULL DEFAULT 'announcement',
  is_pinned   boolean NOT NULL DEFAULT false,
  created_by  uuid REFERENCES auth.users (id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_updates_team_id_pinned_created_at_idx
  ON public.team_updates (team_id, is_pinned DESC, created_at DESC);

ALTER TABLE public.team_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_updates_select_member" ON public.team_updates;
CREATE POLICY "team_updates_select_member"
  ON public.team_updates FOR SELECT
  TO authenticated
  USING (public.is_team_member(team_id));

DROP POLICY IF EXISTS "team_updates_insert_editors" ON public.team_updates;
CREATE POLICY "team_updates_insert_editors"
  ON public.team_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_edit_team(team_id)
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "team_updates_update_editors" ON public.team_updates;
CREATE POLICY "team_updates_update_editors"
  ON public.team_updates FOR UPDATE
  TO authenticated
  USING (public.can_edit_team(team_id))
  WITH CHECK (public.can_edit_team(team_id));

DROP POLICY IF EXISTS "team_updates_delete_editors" ON public.team_updates;
CREATE POLICY "team_updates_delete_editors"
  ON public.team_updates FOR DELETE
  TO authenticated
  USING (public.can_edit_team(team_id));
