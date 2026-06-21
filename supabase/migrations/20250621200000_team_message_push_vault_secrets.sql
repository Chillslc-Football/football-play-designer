-- Simplify notify_team_message_push() to webhook-secret-only Vault auth.
-- Replaces any prior version (hardcoded secrets or push_notification_bearer).

CREATE OR REPLACE FUNCTION public.notify_team_message_push()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  push_webhook_secret text;
begin
  select decrypted_secret into push_webhook_secret
  from vault.decrypted_secrets
  where name = 'push_webhook_secret'
  limit 1;

  if push_webhook_secret is null then
    raise warning 'notify_team_message_push: missing vault secret push_webhook_secret';
    return new;
  end if;

  perform net.http_post(
    url := 'https://dvcvpfifigwusuqnlwgq.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
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
