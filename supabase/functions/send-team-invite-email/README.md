# send-team-invite-email Edge Function

Sends transactional team invite emails after an invite is created in `public.team_invites`.

## What it does

1. Accepts `{ token }` or `{ invite_id }` in the POST body
2. Authenticates the caller via the Supabase user JWT (`Authorization` header)
3. Loads the invite, team name, and inviter profile (service role)
4. Verifies the caller may invite members for that team (same rules as `team_invites` RLS)
5. Builds the invite URL from `APP_URL`
6. Sends email via [Resend](https://resend.com)

## Deploy

From the `FootballPlayDesigner` repo root:

```bash
supabase functions deploy send-team-invite-email
```

Set secrets:

```bash
supabase secrets set SERVICE_ROLE_KEY=your-service-role-jwt
supabase secrets set RESEND_API_KEY=re_your_resend_api_key
supabase secrets set RESEND_FROM_EMAIL="Football Play Designer <invites@yourdomain.com>"
supabase secrets set APP_URL=https://your-production-app-url.com
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are provided automatically in Edge Functions.

## Required secrets

| Secret | Purpose |
|--------|---------|
| `SERVICE_ROLE_KEY` | Service role JWT for loading invite/team/profile data |
| `RESEND_API_KEY` | Resend API key (never expose to frontend) |
| `RESEND_FROM_EMAIL` | Verified sender address in Resend |
| `APP_URL` | Public app origin used in invite links (no trailing slash) |

`SITE_URL` is accepted as a fallback for `APP_URL`.

## Permission check

The function reads the caller's `team_members.role` for the invite's team and applies the same rules as invite creation:

- `team_owner` may send invites for `coach`, `player`, or `parent`
- `coach` may send invites for `player` or `parent` only
- `player` and `parent` are rejected

## Invoke from the app

```typescript
await supabase.functions.invoke('send-team-invite-email', {
  body: { token: inviteToken },
})
```

The Supabase client attaches the signed-in user's JWT automatically.

## Email content

- **Subject:** `You're invited to join {teamName}`
- **Body:** inviter name, team name, role, invite URL, 14-day expiry notice
