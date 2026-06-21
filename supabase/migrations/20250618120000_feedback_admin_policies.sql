-- App admin feedback review: read and resolve open feedback across all teams.
-- Requires public.feedback table and public.is_app_admin() (admin_scheme_templates migration).
-- Does not alter feedback table schema.
--
-- Team-scoped SELECT policies on public.feedback only return rows for the caller's teams.
-- App admins need explicit cross-team access via RLS policies and/or the RPCs below.

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_app_admin_select ON public.feedback;
CREATE POLICY feedback_app_admin_select
  ON public.feedback
  FOR SELECT
  TO authenticated
  USING (public.is_app_admin());

DROP POLICY IF EXISTS feedback_app_admin_update ON public.feedback;
CREATE POLICY feedback_app_admin_update
  ON public.feedback
  FOR UPDATE
  TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

DROP FUNCTION IF EXISTS public.get_open_feedback_for_admin();

CREATE OR REPLACE FUNCTION public.get_open_feedback_for_admin()
RETURNS SETOF public.feedback
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT f.*
  FROM public.feedback f
  WHERE f.status IS DISTINCT FROM 'resolved'
  ORDER BY f.created_at DESC;
END;
$$;

DROP FUNCTION IF EXISTS public.resolve_feedback_for_admin(uuid);

CREATE OR REPLACE FUNCTION public.resolve_feedback_for_admin(p_feedback_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.feedback
  SET status = 'resolved'
  WHERE id = p_feedback_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feedback not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_open_feedback_for_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_feedback_for_admin(uuid) TO authenticated;
