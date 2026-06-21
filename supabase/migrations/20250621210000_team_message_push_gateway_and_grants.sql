-- Fix Team Message push: Edge gateway Authorization + service_role read access.
-- Replaces webhook-only notify_team_message_push() from 20250621200000.

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

GRANT SELECT ON TABLE public.team_messages TO service_role;
