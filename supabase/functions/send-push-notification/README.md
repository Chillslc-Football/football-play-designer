# send-push-notification Edge Function

Server-side Expo push delivery for team announcements. Designed to be invoked by a Supabase Database Webhook on `team_updates` INSERT.

## What it does

1. Accepts a webhook payload or direct `{ team_update_id }` / `{ record }` body
2. Loads the team update (if needed)
3. Loads team members for the update's team
4. Excludes `created_by`
5. Loads `push_device_tokens` for remaining users
6. Sends Expo push notifications
7. Removes invalid Expo tokens when Expo returns `DeviceNotRegistered`

## Deploy

From the `FootballPlayDesigner` repo root (where the Supabase project is linked):

```bash
supabase functions deploy send-push-notification
```

Set secrets:

```bash
supabase secrets set SERVICE_ROLE_KEY=your-service-role-jwt
supabase secrets set EXPO_ACCESS_TOKEN=your-expo-access-token
supabase secrets set PUSH_WEBHOOK_SECRET=your-long-random-secret
```

`SUPABASE_URL` is provided automatically in Edge Functions. Set `SERVICE_ROLE_KEY` to the project's **service_role** JWT from **Project Settings → API**.

## Database Webhook setup (team_updates INSERT)

In Supabase Dashboard:

1. Open **Database → Webhooks → Create a new hook**
2. **Name:** `team_updates_insert_push`
3. **Table:** `public.team_updates`
4. **Events:** `INSERT` only
5. **Type:** Supabase Edge Function
6. **Function:** `send-push-notification`
7. **HTTP Headers** (if not using the built-in Edge Function integration):
   - `Authorization: Bearer <SERVICE_ROLE_KEY value>`
   - `x-push-webhook-secret: <PUSH_WEBHOOK_SECRET>`

If using the Dashboard Edge Function webhook type, Supabase handles auth to the function. Still set `PUSH_WEBHOOK_SECRET` if you want an extra shared secret check.

### Manual webhook URL (HTTP Request type)

```
POST https://<project-ref>.supabase.co/functions/v1/send-push-notification
```

Headers:

```
Authorization: Bearer <service-role-jwt>
Content-Type: application/json
x-push-webhook-secret: <PUSH_WEBHOOK_SECRET>
```

Body template for INSERT webhooks is automatic. Expected payload shape:

```json
{
  "type": "INSERT",
  "table": "team_updates",
  "schema": "public",
  "record": {
    "id": "...",
    "team_id": "...",
    "title": "...",
    "body": "...",
    "created_by": "..."
  }
}
```

## Direct invoke (manual test)

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/send-push-notification" \
  -H "Authorization: Bearer <service-role-jwt>" \
  -H "Content-Type: application/json" \
  -H "x-push-webhook-secret: <PUSH_WEBHOOK_SECRET>" \
  -d '{"notification_type":"team_update","team_update_id":"<uuid>"}'
```

## Future notification types

Add new handlers under `supabase/functions/_shared/` and route by `notification_type` in `index.ts` for calendar, messaging, attendance, and practice plans.
