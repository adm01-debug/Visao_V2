-- Os default privileges do papel dono concediam TUDO a `authenticated`.
-- Escrita nestas tabelas é exclusividade das rotinas SECURITY DEFINER.
REVOKE ALL ON public.device_registrations FROM authenticated;
REVOKE ALL ON public.device_registration_audit FROM authenticated;
GRANT SELECT ON public.device_registrations TO authenticated;
GRANT SELECT ON public.device_registration_audit TO authenticated;

REVOKE ALL ON public.device_registrations FROM anon;
REVOKE ALL ON public.device_registration_audit FROM anon;