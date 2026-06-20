-- Grant table access for team_invites (and related admin reads in send-team-invite-email).

GRANT ALL ON TABLE public.team_invites TO service_role;
GRANT ALL ON TABLE public.team_invites TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_invites TO authenticated;

GRANT ALL ON TABLE public.teams TO service_role;
GRANT ALL ON TABLE public.profiles TO service_role;
