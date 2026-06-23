-- Enable Supabase Realtime for team_message_reads INSERTs (live read receipts for coaches).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'team_message_reads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_message_reads;
  END IF;
END
$$;
