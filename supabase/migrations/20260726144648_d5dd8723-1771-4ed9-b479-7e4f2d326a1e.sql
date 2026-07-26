-- Onda 101: reduzir superfície de ataque de funções SECURITY DEFINER.
-- SECURITY DEFINER ignora RLS; nenhuma dessas funções deve ser alcançável por `anon`.
DO $$
DECLARE
  fn text;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure::text
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.prorettype <> 'trigger'::regtype
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
  END LOOP;

  -- Funções de trigger não são chamáveis via API: revogar de todos os papéis de API.
  FOR fn IN
    SELECT p.oid::regprocedure::text
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;

-- Reconceder explicitamente o que a aplicação autenticada consome via RPC.
GRANT EXECUTE ON FUNCTION public.get_camera_stream_url(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_camera_credentials(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_test_mode_active(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_ptz_lock(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_ptz_lock(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_nvr_with_channels(text, text, text, text, integer, text, integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_settings_backup(jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_schedule_cameras(uuid, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_media_legal_hold(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.audit_cameras_embedded_credentials() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_storage_tiering_slo(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_storage_tier_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_glacier_restore_status(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_preview_telemetry_summary(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_relay_agent_reliability(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_api_usage_stats(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_media_forget_audit(integer, integer, uuid) TO authenticated;

-- Serviços internos (Edge Functions / cron) seguem com acesso total.
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;