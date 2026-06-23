-- Step 1: add direct thread kind (must commit before use in follow-up migration).

DO $$
BEGIN
  ALTER TYPE public.team_message_thread_kind ADD VALUE IF NOT EXISTS 'direct';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;
