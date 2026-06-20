# send-playbook-email Edge Function

Sends playbook share emails to active team members via Resend (no PDF, no public token).

## What it does

1. Accepts `{ team_id, recipient_email, note? }` in the POST body
2. Authenticates the caller via the Supabase user JWT
3. Verifies the caller is `team_owner` or `coach` for the team
4. Verifies `recipient_email` belongs to an active team member (`is_team_member_by_email` RPC)
5. Sends email with link: `{APP_URL}/?team={team_id}&open=play-library`

## Prerequisites

Apply migration (creates `is_team_member_by_email` RPC):

```bash
supabase db push
```

Or run `supabase/migrations/20250620170000_team_member_by_email.sql` in the Supabase SQL editor.

## Deploy

From the repo root:

```bash
supabase functions deploy send-playbook-email
```

## Required secrets

Same as `send-team-invite-email`:

```bash
supabase secrets set RESEND_API_KEY=re_your_resend_api_key
supabase secrets set RESEND_FROM_EMAIL="Winners Choice Playbook <invites@winnerschoiceplaybook.com>"
supabase secrets set APP_URL=https://www.winnerschoiceplaybook.com
supabase secrets set SERVICE_ROLE_KEY=your-service-role-jwt
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are provided automatically in Edge Functions.

## Permission check

- Caller must be `team_owner` or `coach` on `team_id`
- Recipient must be an active `team_members` row (matched by auth email)

## Invoke from the app

```typescript
await supabase.functions.invoke('send-playbook-email', {
  body: {
    team_id: teamId,
    recipient_email: recipientEmail,
    note: optionalNote,
  },
})
```

## Email content

- **Subject:** `{teamName} playbook shared with you`
- **Body:** sender name, team name, optional note, Open Playbook link
