-- Set created_by from the authenticated user on insert; do not accept it from the client.

ALTER TABLE public.wristband_cards
  ALTER COLUMN created_by SET DEFAULT auth.uid();
