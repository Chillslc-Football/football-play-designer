# send-push-notification Edge Function

Server-side Expo push delivery for team announcements and team chat messages. Invoked by Supabase Database Webhooks on `team_updates` and `team_messages` INSERT.

## What it does

### Team updates

1. Accepts a webhook payload or direct `{ team_update_id }` / `{ record }` body
2. Loads the team update (if needed)
3. Loads team members for the update's team
4. Excludes `created_by`
5. Loads `push_device_tokens` for remaining users
6. Sends Expo push notifications
7. Removes invalid Expo tokens when Expo returns `DeviceNotRegistered`

### Team messages

1. Accepts a webhook payload or direct `{ team_message_id }` / `{ message_id }` / `{ record }` body
2. Loads the team message (if needed)
3. Loads team members for the message's team
4. Excludes `sender_id`
5. Loads `push_device_tokens` for remaining users
6. Sends Expo push notifications with title `Team Chat`
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

## Required webhook headers and secrets

All database webhooks should target the same Edge Function with the same auth:

| Header | Value |
|--------|--------|
| `Authorization` | `Bearer <SERVICE_ROLE_KEY>` |
| `Content-Type` | `application/json` |
| `x-push-webhook-secret` | `<PUSH_WEBHOOK_SECRET>` |

Secrets required by the Edge Function:

- `SERVICE_ROLE_KEY` — service role JWT for admin reads
- `EXPO_ACCESS_TOKEN` — optional but recommended for Expo Push API
- `PUSH_WEBHOOK_SECRET` — shared secret checked via `x-push-webhook-secret`

If using the Dashboard **Supabase Edge Function** webhook type, Supabase may handle `Authorization` automatically. Still set `PUSH_WEBHOOK_SECRET` if you want the extra shared secret check.

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

Expected payload shape:

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

## Database Webhook setup (team_messages INSERT)

In Supabase Dashboard:

1. Open **Database → Webhooks → Create a new hook**
2. **Name:** `team_messages_insert_push`
3. **Table:** `public.team_messages`
4. **Events:** `INSERT` only
5. **Type:** Supabase Edge Function
6. **Function:** `send-push-notification`
7. **HTTP Headers** (if not using the built-in Edge Function integration):
   - `Authorization: Bearer <SERVICE_ROLE_KEY value>`
   - `x-push-webhook-secret: <PUSH_WEBHOOK_SECRET>`

Expected payload shape:

```json
{
  "type": "INSERT",
  "table": "team_messages",
  "schema": "public",
  "record": {
    "id": "...",
    "team_id": "...",
    "thread_id": "...",
    "sender_id": "...",
    "body": "..."
  }
}
```

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

Body template for INSERT webhooks is automatic.

## Direct invoke (manual test)

### Team update

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/send-push-notification" \
  -H "Authorization: Bearer <service-role-jwt>" \
  -H "Content-Type: application/json" \
  -H "x-push-webhook-secret: <PUSH_WEBHOOK_SECRET>" \
  -d '{"notification_type":"team_update","team_update_id":"<uuid>"}'
```

### Team message

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/send-push-notification" \
  -H "Authorization: Bearer <service-role-jwt>" \
  -H "Content-Type: application/json" \
  -H "x-push-webhook-secret: <PUSH_WEBHOOK_SECRET>" \
  -d '{"notification_type":"team_message","team_message_id":"<uuid>"}'
```

Alternate id field names also work:

```json
{
  "notification_type": "team_message",
  "message_id": "<uuid>"
}
```

Example success response:

```json
{
  "ok": true,
  "notification_type": "team_message",
  "message_id": "<uuid>",
  "team_id": "<uuid>",
  "recipient_count": 3,
  "token_count": 2,
  "sent": 2,
  "failed": 0,
  "removed_invalid_tokens": 0
}
```

## Future notification types

Add new handlers under `supabase/functions/_shared/` and route by `notification_type` in `index.ts` for calendar, attendance, and practice plans.
