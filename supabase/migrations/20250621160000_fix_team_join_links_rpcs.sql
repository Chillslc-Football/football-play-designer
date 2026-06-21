-- Production-safe patch: fix idempotent ensure + ambiguous team_id in accept RPC.
-- Safe to run in Supabase SQL Editor on existing databases (CREATE OR REPLACE only).

CREATE OR REPLACE FUNCTION public.ensure_team_join_link(
  p_team_id uuid,
  p_role public.team_role
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_role = 'team_owner' OR p_role NOT IN ('coach', 'player', 'parent') THEN
    RAISE EXCEPTION 'Invalid join link role';
  END IF;

  IF NOT public.can_manage_team_join_link(p_team_id, p_role) THEN
    RAISE EXCEPTION 'Not allowed to manage join links for this role';
  END IF;

  SELECT jl.token
  INTO v_token
  FROM public.team_join_links jl
  WHERE jl.team_id = p_team_id
    AND jl.role = p_role
    AND jl.revoked_at IS NULL
  LIMIT 1;

  IF v_token IS NOT NULL THEN
    RETURN v_token;
  END IF;

  BEGIN
    INSERT INTO public.team_join_links (team_id, role, created_by)
    VALUES (p_team_id, p_role, auth.uid())
    RETURNING token INTO v_token;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT jl.token
      INTO v_token
      FROM public.team_join_links jl
      WHERE jl.team_id = p_team_id
        AND jl.role = p_role
        AND jl.revoked_at IS NULL
      LIMIT 1;
  END;

  IF v_token IS NULL THEN
    RAISE EXCEPTION 'Could not ensure team join link';
  END IF;

  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_team_join_links(p_team_id uuid)
RETURNS TABLE (
  role public.team_role,
  token text,
  created_at timestamptz,
  last_used_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.team_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  FOREACH v_role IN ARRAY ARRAY['coach', 'player', 'parent']::public.team_role[]
  LOOP
    IF public.can_manage_team_join_link(p_team_id, v_role) THEN
      PERFORM public.ensure_team_join_link(p_team_id, v_role);

      RETURN QUERY
      SELECT jl.role, jl.token, jl.created_at, jl.last_used_at
      FROM public.team_join_links jl
      WHERE jl.team_id = p_team_id
        AND jl.role = v_role
        AND jl.revoked_at IS NULL;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.regenerate_team_join_link(
  p_team_id uuid,
  p_role public.team_role
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_role = 'team_owner' OR p_role NOT IN ('coach', 'player', 'parent') THEN
    RAISE EXCEPTION 'Invalid join link role';
  END IF;

  IF NOT public.can_manage_team_join_link(p_team_id, p_role) THEN
    RAISE EXCEPTION 'Not allowed to manage join links for this role';
  END IF;

  UPDATE public.team_join_links jl
  SET revoked_at = now()
  WHERE jl.team_id = p_team_id
    AND jl.role = p_role
    AND jl.revoked_at IS NULL;

  BEGIN
    INSERT INTO public.team_join_links (team_id, role, created_by)
    VALUES (p_team_id, p_role, auth.uid())
    RETURNING token INTO v_token;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT jl.token
      INTO v_token
      FROM public.team_join_links jl
      WHERE jl.team_id = p_team_id
        AND jl.role = p_role
        AND jl.revoked_at IS NULL
      LIMIT 1;
  END;

  IF v_token IS NULL THEN
    RAISE EXCEPTION 'Could not regenerate team join link';
  END IF;

  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.preview_team_join_link(p_token text)
RETURNS TABLE (
  team_name text,
  role public.team_role,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link public.team_join_links%ROWTYPE;
  v_team_name text;
BEGIN
  SELECT jl.*
  INTO v_link
  FROM public.team_join_links jl
  WHERE jl.token = trim(p_token);

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::text, NULL::public.team_role, 'invalid'::text;
    RETURN;
  END IF;

  SELECT t.name
  INTO v_team_name
  FROM public.teams t
  WHERE t.id = v_link.team_id;

  IF v_link.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT v_team_name, v_link.role, 'revoked'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT v_team_name, v_link.role, 'active'::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_team_join_link(p_token text)
RETURNS TABLE (
  team_id uuid,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link public.team_join_links%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT jl.*
  INTO v_link
  FROM public.team_join_links jl
  WHERE jl.token = trim(p_token)
    AND jl.revoked_at IS NULL
  FOR UPDATE OF jl;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, 'invalid'::text;
    RETURN;
  END IF;

  IF v_link.role = 'team_owner' OR v_link.role NOT IN ('coach', 'player', 'parent') THEN
    RETURN QUERY SELECT NULL::uuid, 'invalid'::text;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.team_id = v_link.team_id
      AND tm.user_id = auth.uid()
  ) THEN
    RETURN QUERY
    SELECT v_link.team_id AS out_team_id, 'already_member'::text AS out_status;
    RETURN;
  END IF;

  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_link.team_id, auth.uid(), v_link.role);

  UPDATE public.team_join_links jl
  SET last_used_at = now()
  WHERE jl.id = v_link.id;

  UPDATE public.profiles p
  SET last_team_id = v_link.team_id
  WHERE p.id = auth.uid();

  RETURN QUERY
  SELECT v_link.team_id AS out_team_id, 'joined'::text AS out_status;
END;
$$;
