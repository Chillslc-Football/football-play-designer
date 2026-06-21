-- Team invite flow: table, RLS, and RPCs (idempotent).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_role') THEN
    CREATE TYPE public.team_role AS ENUM ('team_owner', 'coach', 'player', 'parent');
  END IF;
END
$$;

ALTER TYPE public.team_role ADD VALUE IF NOT EXISTS 'parent';

CREATE TABLE IF NOT EXISTS public.team_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  role        public.team_role NOT NULL,
  email       text NOT NULL,
  token       text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_by  uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  accepted_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  accepted_at timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_invites_role_check CHECK (role IN ('coach', 'player', 'parent')),
  CONSTRAINT team_invites_acceptance_check CHECK (
    accepted_at IS NULL OR (accepted_by IS NOT NULL AND revoked_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS team_invites_team_id_idx ON public.team_invites (team_id);
CREATE INDEX IF NOT EXISTS team_invites_token_idx ON public.team_invites (token);

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_invites_select_editors" ON public.team_invites;
CREATE POLICY "team_invites_select_editors"
  ON public.team_invites FOR SELECT
  TO authenticated
  USING (public.can_edit_team(team_id));

DROP POLICY IF EXISTS "team_invites_insert_editors" ON public.team_invites;
CREATE POLICY "team_invites_insert_editors"
  ON public.team_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND role IN ('coach', 'player', 'parent')
    AND (
      (role = 'coach' AND public.is_team_owner(team_id))
      OR (role IN ('player', 'parent') AND public.can_edit_team(team_id))
    )
  );

DROP POLICY IF EXISTS "team_invites_update_owner_revoke" ON public.team_invites;
CREATE POLICY "team_invites_update_owner_revoke"
  ON public.team_invites FOR UPDATE
  TO authenticated
  USING (public.is_team_owner(team_id))
  WITH CHECK (public.is_team_owner(team_id));

DROP POLICY IF EXISTS "team_invites_delete_owner" ON public.team_invites;
CREATE POLICY "team_invites_delete_owner"
  ON public.team_invites FOR DELETE
  TO authenticated
  USING (public.is_team_owner(team_id));

DROP FUNCTION IF EXISTS public.create_team_invite(uuid, public.team_role, text);

CREATE OR REPLACE FUNCTION public.create_team_invite(
  p_team_id uuid,
  p_role public.team_role,
  p_email text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_email := lower(trim(p_email));
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Invite email is required';
  END IF;

  IF p_role = 'team_owner' THEN
    RAISE EXCEPTION 'Cannot invite team_owner';
  END IF;

  IF p_role NOT IN ('coach', 'player', 'parent') THEN
    RAISE EXCEPTION 'Invalid invite role';
  END IF;

  IF p_role = 'coach' THEN
    IF NOT public.is_team_owner(p_team_id) THEN
      RAISE EXCEPTION 'Only team owners can invite coaches';
    END IF;
  ELSIF NOT public.can_edit_team(p_team_id) THEN
    RAISE EXCEPTION 'Not allowed to invite for this team';
  END IF;

  INSERT INTO public.team_invites (team_id, role, email, created_by)
  VALUES (p_team_id, p_role, v_email, auth.uid())
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$$;

DROP FUNCTION IF EXISTS public.preview_team_invite(text);

CREATE OR REPLACE FUNCTION public.preview_team_invite(p_token text)
RETURNS TABLE (
  team_name text,
  role public.team_role,
  email text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.team_invites%ROWTYPE;
  v_team_name text;
BEGIN
  SELECT *
  INTO v_invite
  FROM public.team_invites
  WHERE token = trim(p_token);

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::text, NULL::public.team_role, NULL::text, 'invalid'::text;
    RETURN;
  END IF;

  SELECT name INTO v_team_name FROM public.teams WHERE id = v_invite.team_id;

  IF v_invite.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT v_team_name, v_invite.role, v_invite.email, 'revoked'::text;
    RETURN;
  END IF;

  IF v_invite.accepted_at IS NOT NULL THEN
    RETURN QUERY SELECT v_team_name, v_invite.role, v_invite.email, 'accepted'::text;
    RETURN;
  END IF;

  IF v_invite.expires_at <= now() THEN
    RETURN QUERY SELECT v_team_name, v_invite.role, v_invite.email, 'expired'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT v_team_name, v_invite.role, v_invite.email, 'pending'::text;
END;
$$;

DROP FUNCTION IF EXISTS public.accept_team_invite(text);

CREATE OR REPLACE FUNCTION public.accept_team_invite(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.team_invites%ROWTYPE;
  v_user_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO v_invite
  FROM public.team_invites
  WHERE token = trim(p_token)
    AND revoked_at IS NULL
    AND accepted_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  SELECT lower(email)
  INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  IF lower(v_invite.email) <> v_user_email THEN
    RAISE EXCEPTION 'Invite email does not match your account';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE team_id = v_invite.team_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You are already a member of this team';
  END IF;

  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_invite.team_id, auth.uid(), v_invite.role);

  UPDATE public.team_invites
  SET accepted_by = auth.uid(),
      accepted_at = now()
  WHERE id = v_invite.id;

  UPDATE public.profiles
  SET last_team_id = v_invite.team_id
  WHERE id = auth.uid();

  RETURN v_invite.team_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_team_invite(uuid, public.team_role, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_team_invite(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_team_invite(text) TO authenticated;
