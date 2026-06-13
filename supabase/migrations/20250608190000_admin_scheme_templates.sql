-- Global offensive formation and defensive front templates (app admin only).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_app_admin boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.is_app_admin FROM public.profiles p WHERE p.id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_app_admin() TO authenticated;

CREATE TABLE IF NOT EXISTS public.formation_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  label           text NOT NULL,
  positions       jsonb NOT NULL,
  position_labels jsonb,
  is_default      boolean NOT NULL DEFAULT false,
  created_by      uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.defensive_front_templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text NOT NULL UNIQUE,
  label      text NOT NULL,
  positions  jsonb NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS formation_templates_one_default_idx
  ON public.formation_templates ((true))
  WHERE is_default;

CREATE UNIQUE INDEX IF NOT EXISTS defensive_front_templates_one_default_idx
  ON public.defensive_front_templates ((true))
  WHERE is_default;

CREATE INDEX IF NOT EXISTS formation_templates_label_idx
  ON public.formation_templates (label);

CREATE INDEX IF NOT EXISTS defensive_front_templates_label_idx
  ON public.defensive_front_templates (label);

ALTER TABLE public.formation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defensive_front_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "formation_templates_select_authenticated" ON public.formation_templates;
CREATE POLICY "formation_templates_select_authenticated"
  ON public.formation_templates FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "formation_templates_insert_admin" ON public.formation_templates;
CREATE POLICY "formation_templates_insert_admin"
  ON public.formation_templates FOR INSERT
  TO authenticated
  WITH CHECK (public.is_app_admin());

DROP POLICY IF EXISTS "formation_templates_update_admin" ON public.formation_templates;
CREATE POLICY "formation_templates_update_admin"
  ON public.formation_templates FOR UPDATE
  TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

DROP POLICY IF EXISTS "formation_templates_delete_admin" ON public.formation_templates;
CREATE POLICY "formation_templates_delete_admin"
  ON public.formation_templates FOR DELETE
  TO authenticated
  USING (public.is_app_admin());

DROP POLICY IF EXISTS "defensive_front_templates_select_authenticated" ON public.defensive_front_templates;
CREATE POLICY "defensive_front_templates_select_authenticated"
  ON public.defensive_front_templates FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "defensive_front_templates_insert_admin" ON public.defensive_front_templates;
CREATE POLICY "defensive_front_templates_insert_admin"
  ON public.defensive_front_templates FOR INSERT
  TO authenticated
  WITH CHECK (public.is_app_admin());

DROP POLICY IF EXISTS "defensive_front_templates_update_admin" ON public.defensive_front_templates;
CREATE POLICY "defensive_front_templates_update_admin"
  ON public.defensive_front_templates FOR UPDATE
  TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

DROP POLICY IF EXISTS "defensive_front_templates_delete_admin" ON public.defensive_front_templates;
CREATE POLICY "defensive_front_templates_delete_admin"
  ON public.defensive_front_templates FOR DELETE
  TO authenticated
  USING (public.is_app_admin());

CREATE OR REPLACE FUNCTION public.set_default_formation_template(p_template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.formation_templates WHERE id = p_template_id) THEN
    RAISE EXCEPTION 'Formation template not found';
  END IF;

  UPDATE public.formation_templates SET is_default = false WHERE is_default;
  UPDATE public.formation_templates
  SET is_default = true, updated_at = now()
  WHERE id = p_template_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_default_defensive_front_template(p_template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.defensive_front_templates WHERE id = p_template_id) THEN
    RAISE EXCEPTION 'Defensive front template not found';
  END IF;

  UPDATE public.defensive_front_templates SET is_default = false WHERE is_default;
  UPDATE public.defensive_front_templates
  SET is_default = true, updated_at = now()
  WHERE id = p_template_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_default_formation_template(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_default_defensive_front_template(uuid) TO authenticated;

GRANT SELECT ON public.formation_templates TO authenticated;
GRANT SELECT ON public.defensive_front_templates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.formation_templates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.defensive_front_templates TO authenticated;
