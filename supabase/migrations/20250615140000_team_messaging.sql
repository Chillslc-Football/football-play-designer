-- Team messaging: threads, messages, and read receipts.
-- Apply in Supabase SQL editor before testing Team Messaging in the app.

CREATE TABLE IF NOT EXISTS public.team_message_threads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  title           text NOT NULL DEFAULT 'Team Chat',
  created_by      uuid NOT NULL REFERENCES auth.users (id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  CONSTRAINT team_message_threads_team_id_title_key UNIQUE (team_id, title)
);

CREATE INDEX IF NOT EXISTS team_message_threads_team_id_idx
  ON public.team_message_threads (team_id);

CREATE TABLE IF NOT EXISTS public.team_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id  uuid NOT NULL REFERENCES public.team_message_threads (id) ON DELETE CASCADE,
  team_id    uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  sender_id  uuid NOT NULL REFERENCES auth.users (id),
  body       text NOT NULL CHECK (char_length(trim(body)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at  timestamptz,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS team_messages_team_id_idx
  ON public.team_messages (team_id);

CREATE INDEX IF NOT EXISTS team_messages_thread_id_idx
  ON public.team_messages (thread_id);

CREATE INDEX IF NOT EXISTS team_messages_created_at_idx
  ON public.team_messages (created_at);

CREATE TABLE IF NOT EXISTS public.team_message_reads (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  thread_id  uuid NOT NULL REFERENCES public.team_message_threads (id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.team_messages (id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users (id),
  read_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_message_reads_user_id_message_id_key UNIQUE (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS team_message_reads_user_id_idx
  ON public.team_message_reads (user_id);

CREATE INDEX IF NOT EXISTS team_message_reads_thread_id_idx
  ON public.team_message_reads (thread_id);

CREATE OR REPLACE FUNCTION public.team_messages_validate_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_thread_team_id uuid;
BEGIN
  SELECT team_id
  INTO v_thread_team_id
  FROM public.team_message_threads
  WHERE id = NEW.thread_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'team_messages.thread_id % does not reference an existing team_message_threads row', NEW.thread_id;
  END IF;

  IF NEW.team_id IS DISTINCT FROM v_thread_team_id THEN
    RAISE EXCEPTION
      'team_messages.team_id % must match team_message_threads.team_id % for thread_id %',
      NEW.team_id,
      v_thread_team_id,
      NEW.thread_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_messages_validate_scope ON public.team_messages;

CREATE TRIGGER team_messages_validate_scope
  BEFORE INSERT OR UPDATE OF thread_id, team_id ON public.team_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.team_messages_validate_scope();

CREATE OR REPLACE FUNCTION public.team_message_reads_validate_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_thread_team_id uuid;
  v_message_thread_id uuid;
  v_message_team_id uuid;
BEGIN
  SELECT team_id
  INTO v_thread_team_id
  FROM public.team_message_threads
  WHERE id = NEW.thread_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'team_message_reads.thread_id % does not reference an existing team_message_threads row',
      NEW.thread_id;
  END IF;

  IF NEW.team_id IS DISTINCT FROM v_thread_team_id THEN
    RAISE EXCEPTION
      'team_message_reads.team_id % must match team_message_threads.team_id % for thread_id %',
      NEW.team_id,
      v_thread_team_id,
      NEW.thread_id;
  END IF;

  SELECT thread_id, team_id
  INTO v_message_thread_id, v_message_team_id
  FROM public.team_messages
  WHERE id = NEW.message_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'team_message_reads.message_id % does not reference an existing team_messages row',
      NEW.message_id;
  END IF;

  IF NEW.thread_id IS DISTINCT FROM v_message_thread_id THEN
    RAISE EXCEPTION
      'team_message_reads.thread_id % must match team_messages.thread_id % for message_id %',
      NEW.thread_id,
      v_message_thread_id,
      NEW.message_id;
  END IF;

  IF NEW.team_id IS DISTINCT FROM v_message_team_id THEN
    RAISE EXCEPTION
      'team_message_reads.team_id % must match team_messages.team_id % for message_id %',
      NEW.team_id,
      v_message_team_id,
      NEW.message_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_message_reads_validate_scope ON public.team_message_reads;

CREATE TRIGGER team_message_reads_validate_scope
  BEFORE INSERT OR UPDATE OF team_id, thread_id, message_id ON public.team_message_reads
  FOR EACH ROW
  EXECUTE FUNCTION public.team_message_reads_validate_scope();

CREATE OR REPLACE FUNCTION public.team_messages_bump_thread_activity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.team_message_threads
  SET last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.thread_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_messages_bump_thread_activity ON public.team_messages;

CREATE TRIGGER team_messages_bump_thread_activity
  AFTER INSERT ON public.team_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.team_messages_bump_thread_activity();

ALTER TABLE public.team_message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_message_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_message_threads_select_member" ON public.team_message_threads;
CREATE POLICY "team_message_threads_select_member"
  ON public.team_message_threads FOR SELECT
  TO authenticated
  USING (public.is_team_member(team_id));

DROP POLICY IF EXISTS "team_message_threads_insert_member" ON public.team_message_threads;
CREATE POLICY "team_message_threads_insert_member"
  ON public.team_message_threads FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_team_member(team_id)
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "team_message_threads_update_editors" ON public.team_message_threads;
CREATE POLICY "team_message_threads_update_editors"
  ON public.team_message_threads FOR UPDATE
  TO authenticated
  USING (public.can_edit_team(team_id))
  WITH CHECK (public.can_edit_team(team_id));

DROP POLICY IF EXISTS "team_message_threads_delete_editors" ON public.team_message_threads;
CREATE POLICY "team_message_threads_delete_editors"
  ON public.team_message_threads FOR DELETE
  TO authenticated
  USING (public.can_edit_team(team_id));

DROP POLICY IF EXISTS "team_messages_select_member" ON public.team_messages;
CREATE POLICY "team_messages_select_member"
  ON public.team_messages FOR SELECT
  TO authenticated
  USING (public.is_team_member(team_id));

DROP POLICY IF EXISTS "team_messages_insert_member" ON public.team_messages;
CREATE POLICY "team_messages_insert_member"
  ON public.team_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_team_member(team_id)
    AND sender_id = auth.uid()
  );

DROP POLICY IF EXISTS "team_messages_update_sender_or_editors" ON public.team_messages;
CREATE POLICY "team_messages_update_sender_or_editors"
  ON public.team_messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid() OR public.can_edit_team(team_id))
  WITH CHECK (sender_id = auth.uid() OR public.can_edit_team(team_id));

DROP POLICY IF EXISTS "team_messages_delete_sender_or_editors" ON public.team_messages;
CREATE POLICY "team_messages_delete_sender_or_editors"
  ON public.team_messages FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid() OR public.can_edit_team(team_id));

DROP POLICY IF EXISTS "team_message_reads_select_member" ON public.team_message_reads;
CREATE POLICY "team_message_reads_select_member"
  ON public.team_message_reads FOR SELECT
  TO authenticated
  USING (public.is_team_member(team_id));

DROP POLICY IF EXISTS "team_message_reads_insert_member" ON public.team_message_reads;
CREATE POLICY "team_message_reads_insert_member"
  ON public.team_message_reads FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_team_member(team_id)
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "team_message_reads_update_own" ON public.team_message_reads;
CREATE POLICY "team_message_reads_update_own"
  ON public.team_message_reads FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "team_message_reads_delete_own" ON public.team_message_reads;
CREATE POLICY "team_message_reads_delete_own"
  ON public.team_message_reads FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_or_create_team_chat_thread(p_team_id uuid)
RETURNS public.team_message_threads
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_thread public.team_message_threads;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_team_member(p_team_id) THEN
    RAISE EXCEPTION 'Not a member of this team';
  END IF;

  SELECT *
  INTO v_thread
  FROM public.team_message_threads
  WHERE team_id = p_team_id
    AND title = 'Team Chat';

  IF FOUND THEN
    RETURN v_thread;
  END IF;

  BEGIN
    INSERT INTO public.team_message_threads (team_id, title, created_by)
    VALUES (p_team_id, 'Team Chat', auth.uid())
    RETURNING * INTO v_thread;

    RETURN v_thread;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT *
      INTO v_thread
      FROM public.team_message_threads
      WHERE team_id = p_team_id
        AND title = 'Team Chat';

      RETURN v_thread;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_team_chat_thread(uuid) TO authenticated;
