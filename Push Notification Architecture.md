\# Push Notification Architecture



\## Purpose

Push notifications are used to notify team members when important team events happen, starting with Team Updates.



\## Current Flow

1\. Mobile app requests notification permission.

2\. Mobile app gets Expo push token.

3\. Token is saved in Supabase table: public.push\_device\_tokens.

4\. Coach or team\_owner creates a Team Update.

5\. Insert into public.team\_updates fires database trigger.

6\. Trigger calls Supabase Edge Function: send-push-notification.

7\. Edge Function finds team members.

8\. Edge Function excludes the creator.

9\. Edge Function finds push tokens for remaining users.

10\. Edge Function sends notification through Expo Push API.



\## Supabase Tables

\- public.team\_updates

\- public.team\_members

\- public.push\_device\_tokens



\## Edge Function

Path:

supabase/functions/send-push-notification



Function:

send-push-notification



\## Trigger

Trigger:

team\_update\_push\_after\_insert



Function:

public.notify\_team\_update\_push()



Runs after insert on:

public.team\_updates



\## Required Secrets

\- SERVICE\_ROLE\_KEY

\- PUSH\_WEBHOOK\_SECRET



\## Notes

\- Creator is excluded from notification recipients.

\- Invalid Expo tokens are removed automatically.

\- Mobile realtime still updates the Updates screen.

\- Push notifications are for users not actively watching the screen.

