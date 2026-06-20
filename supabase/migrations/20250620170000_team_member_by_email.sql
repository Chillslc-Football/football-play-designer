-- Lookup active team membership by auth email (service role / Edge Functions only).

CREATE OR REPLACE FUNCTION public.is_team_member_by_email(p_team_id uuid, p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
BEGIN
  v_email := lower(trim(p_email));

  IF v_email IS NULL OR v_email = '' THEN
    RETURN false;
  END IF;

  SELECT id
  INTO v_user_id
  FROM auth.users
  WHERE lower(email) = v_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE team_id = p_team_id
      AND user_id = v_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_team_member_by_email(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_team_member_by_email(uuid, text) TO service_role;
