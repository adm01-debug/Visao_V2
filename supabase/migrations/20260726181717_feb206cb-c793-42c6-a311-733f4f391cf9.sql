REVOKE ALL ON FUNCTION public.reap_agent_relay_leases() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reap_agent_relay_leases() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reap_agent_relay_leases() TO service_role;
REVOKE ALL ON FUNCTION public.relay_lease_policy() FROM anon;