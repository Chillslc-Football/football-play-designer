-- Audience mentions (@everyone, @coaches, @players, @parents) for team messages.
-- Derived server-side from body; affects notification targeting only.

CREATE TYPE public.team_message_mention_audience AS ENUM (
  'everyone',
  'coaches',
  'players',
  'parents'
);

ALTER TABLE public.team_messages
  ADD COLUMN IF NOT EXISTS mention_audiences public.team_message_mention_audience[]
  NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.team_messages.mention_audiences IS
  'Audience mention tokens parsed from body on insert. Empty = notify all channel members.';

CREATE OR REPLACE FUNCTION public.parse_team_message_mentions(p_body text)
RETURNS public.team_message_mention_audience[]
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT COALESCE(
    array_agg(DISTINCT match.audience ORDER BY match.audience),
    '{}'::public.team_message_mention_audience[]
  )
  FROM (
    SELECT (regexp_matches(
      lower(p_body),
      '(^|[^[:alnum:]_])@(everyone|coaches|players|parents)([^[:alnum:]_]|$)',
      'g'
    ))[2]::public.team_message_mention_audience AS audience
  ) AS match;
$$;

CREATE OR REPLACE FUNCTION public.set_team_message_mention_audiences()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.mention_audiences := public.parse_team_message_mentions(NEW.body);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_messages_set_mention_audiences ON public.team_messages;

CREATE TRIGGER team_messages_set_mention_audiences
  BEFORE INSERT ON public.team_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_team_message_mention_audiences();
