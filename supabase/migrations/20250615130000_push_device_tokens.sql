-- Mobile push notification device token registry (user-scoped, not team-scoped).
-- Apply in Supabase SQL editor before mobile token registration or Edge Function delivery.
-- Reusable for team updates, calendar, messaging, attendance, and practice plans.

CREATE TABLE IF NOT EXISTS public.push_device_tokens (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  expo_push_token     text NOT NULL UNIQUE,
  platform            text NOT NULL CHECK (platform IN ('android', 'ios')),
  device_label        text,
  last_registered_at  timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_device_tokens_user_id_idx
  ON public.push_device_tokens (user_id);

ALTER TABLE public.push_device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_device_tokens_select_own" ON public.push_device_tokens;
CREATE POLICY "push_device_tokens_select_own"
  ON public.push_device_tokens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "push_device_tokens_insert_own" ON public.push_device_tokens;
CREATE POLICY "push_device_tokens_insert_own"
  ON public.push_device_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push_device_tokens_update_own" ON public.push_device_tokens;
CREATE POLICY "push_device_tokens_update_own"
  ON public.push_device_tokens FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push_device_tokens_delete_own" ON public.push_device_tokens;
CREATE POLICY "push_device_tokens_delete_own"
  ON public.push_device_tokens FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
