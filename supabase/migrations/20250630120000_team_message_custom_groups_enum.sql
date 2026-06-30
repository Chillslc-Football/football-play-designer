-- Step 1: add custom thread kind (commit before use in follow-up migration).

ALTER TYPE public.team_message_thread_kind ADD VALUE IF NOT EXISTS 'custom';
