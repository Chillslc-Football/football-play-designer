-- created_by defaults to auth.uid(); reference auth.users, not profiles, so inserts
-- succeed for authenticated users even when a profiles row is missing.

ALTER TABLE public.wristband_cards
  DROP CONSTRAINT IF EXISTS wristband_cards_created_by_fkey;

ALTER TABLE public.wristband_cards
  ADD CONSTRAINT wristband_cards_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users (id) ON DELETE SET NULL;
