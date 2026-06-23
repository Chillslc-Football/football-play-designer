-- Individual @mentions: server-authoritative mentioned_user_ids from body tokens.
-- Stored token format: @[Display Name](mention:uuid)

ALTER TABLE public.team_messages
  ADD COLUMN IF NOT EXISTS mentioned_user_ids uuid[]
  NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.team_messages.mentioned_user_ids IS
  'User IDs parsed from @[label](mention:uuid) tokens on insert. Notification targeting only.';

CREATE OR REPLACE FUNCTION public.parse_team_message_mentioned_user_ids(
  p_body text,
  p_team_id uuid
)
RETURNS uuid[]
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(DISTINCT matched.user_id ORDER BY matched.user_id),
    '{}'::uuid[]
  )
  FROM (
    SELECT tm.user_id
    FROM regexp_matches(
      p_body,
      '@\[[^\]]+\]\(mention:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)',
      'gi'
    ) AS matches(match_parts)
    INNER JOIN public.team_members tm
      ON tm.user_id = (matches.match_parts)[1]::uuid
      AND tm.team_id = p_team_id
  ) AS matched;
$$;

CREATE OR REPLACE FUNCTION public.set_team_message_mentions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.mention_audiences := public.parse_team_message_mentions(NEW.body);
  NEW.mentioned_user_ids := public.parse_team_message_mentioned_user_ids(NEW.body, NEW.team_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_messages_set_mention_audiences ON public.team_messages;

CREATE TRIGGER team_messages_set_mentions
  BEFORE INSERT ON public.team_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_team_message_mentions();

GRANT EXECUTE ON FUNCTION public.parse_team_message_mentioned_user_ids(text, uuid) TO authenticated;
