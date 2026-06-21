-- Team chat message push: pg_net → send-push-notification.
-- Auth via Supabase Vault (no secrets in repo).
--
-- Prerequisite — run once in Supabase SQL Editor:
--   SELECT vault.create_secret('<PUBLISHABLE_KEY>', 'supabase_publishable_key',
--     'Publishable key for Edge Functions gateway Authorization header');
--   SELECT vault.create_secret('<PUSH_WEBHOOK_SECRET>', 'push_webhook_secret',
--     'Webhook secret for send-push-notification');
-- push_webhook_secret must match Edge Function env PUSH_WEBHOOK_SECRET.

CREATE OR REPLACE FUNCTION public.notify_team_message_push()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  publishable_key text;
  push_webhook_secret text;
begin
  select decrypted_secret into publishable_key
  from vault.decrypted_secrets
  where name = 'supabase_publishable_key'
  limit 1;

  select decrypted_secret into push_webhook_secret
  from vault.decrypted_secrets
  where name = 'push_webhook_secret'
  limit 1;

  if publishable_key is null then
    raise warning 'notify_team_message_push: missing vault secret supabase_publishable_key';
    return new;
  end if;

  if push_webhook_secret is null then
    raise warning 'notify_team_message_push: missing vault secret push_webhook_secret';
    return new;
  end if;

  perform net.http_post(
    url := 'https://dvcvpfifigwusuqnlwgq.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || publishable_key,
      'x-push-webhook-secret', push_webhook_secret
    ),
    body := jsonb_build_object(
      'notification_type', 'team_message',
      'team_message_id', new.id
    )
  );

  return new;
end;
$function$;

DROP TRIGGER IF EXISTS team_message_push_after_insert ON public.team_messages;

CREATE TRIGGER team_message_push_after_insert
  AFTER INSERT ON public.team_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_team_message_push();

GRANT SELECT ON TABLE public.team_messages TO service_role;
