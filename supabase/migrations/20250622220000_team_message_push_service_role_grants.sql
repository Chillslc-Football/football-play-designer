-- Team message push: service_role SELECT grants for send-push-notification Edge Function.
--
-- Root cause: notify_team_message_push() invokes the Edge Function successfully, but
-- adminSelect on team_message_threads fails with SQLSTATE 42501 (permission denied).
-- Only public.team_messages had an explicit service_role grant (20250621210000).
--
-- RLS remains enabled; service_role reads use the service role JWT via PostgREST.
-- profiles already has GRANT ALL to service_role (20250620150000_team_invites_grants).

GRANT SELECT ON TABLE public.team_message_threads TO service_role;

GRANT SELECT ON TABLE public.team_message_thread_participants TO service_role;

GRANT SELECT ON TABLE public.team_members TO service_role;

GRANT SELECT ON TABLE public.push_device_tokens TO service_role;
