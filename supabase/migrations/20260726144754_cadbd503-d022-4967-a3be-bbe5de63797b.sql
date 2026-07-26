-- Onda 102: rotinas internas de manutenção não devem ser chamáveis por usuários finais.
REVOKE ALL ON FUNCTION public.claim_agent_relay_tasks(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_old_test_events() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.close_expired_test_sessions() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.evaluate_and_restart_streams() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_agent_relay_tasks() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.find_glacier_stuck_pending_alert(integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prune_connectivity_resolution_telemetry() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prune_cron_watchdog_escalations() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prune_cron_watchdog_runs() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prune_edge_function_error_audit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prune_preview_telemetry_events() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_bandwidth_samples() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_agent_token(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.point_triggers_motion(uuid, numeric, numeric) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;