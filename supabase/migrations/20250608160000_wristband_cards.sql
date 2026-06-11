-- Printable wristband play card templates per team.

CREATE TABLE IF NOT EXISTS public.wristband_cards (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id           uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  name              text NOT NULL,
  wristband_width   numeric(6, 3) NOT NULL CHECK (wristband_width > 0),
  wristband_height  numeric(6, 3) NOT NULL CHECK (wristband_height > 0),
  size_unit         text NOT NULL DEFAULT 'inches' CHECK (size_unit = 'inches'),
  left_heading      text NOT NULL DEFAULT '',
  right_heading     text NOT NULL DEFAULT '',
  left_play_ids     uuid[] NOT NULL DEFAULT '{}',
  right_play_ids    uuid[] NOT NULL DEFAULT '{}',
  created_by        uuid REFERENCES auth.users (id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wristband_cards_team_id_idx ON public.wristband_cards (team_id);

ALTER TABLE public.wristband_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wristband_cards_select_member" ON public.wristband_cards;
CREATE POLICY "wristband_cards_select_member"
  ON public.wristband_cards FOR SELECT
  TO authenticated
  USING (public.is_team_member(team_id));

DROP POLICY IF EXISTS "wristband_cards_insert_editors" ON public.wristband_cards;
CREATE POLICY "wristband_cards_insert_editors"
  ON public.wristband_cards FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_edit_team(team_id)
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "wristband_cards_update_editors" ON public.wristband_cards;
CREATE POLICY "wristband_cards_update_editors"
  ON public.wristband_cards FOR UPDATE
  TO authenticated
  USING (public.can_edit_team(team_id))
  WITH CHECK (public.can_edit_team(team_id));

DROP POLICY IF EXISTS "wristband_cards_delete_editors" ON public.wristband_cards;
CREATE POLICY "wristband_cards_delete_editors"
  ON public.wristband_cards FOR DELETE
  TO authenticated
  USING (public.can_edit_team(team_id));
