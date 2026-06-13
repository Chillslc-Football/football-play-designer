-- Ensure authenticated role can access admin template tables (RLS still applies).

GRANT SELECT ON public.formation_templates TO authenticated;
GRANT SELECT ON public.defensive_front_templates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.formation_templates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.defensive_front_templates TO authenticated;
