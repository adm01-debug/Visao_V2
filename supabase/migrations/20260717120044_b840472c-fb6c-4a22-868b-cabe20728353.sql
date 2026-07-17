-- Onda 55: Hardening SECURITY DEFINER — revoga EXECUTE público em funções
-- que não devem ser chamadas diretamente por clientes (triggers e manutenção).
-- RPCs intencionalmente expostas (has_role, is_org_member, has_org_role,
-- get_user_role, replace_user_role, delete_user_data, import_settings_backup,
-- get_operational_metrics, get_slow_queries, get_api_usage_stats, system_health)
-- permanecem executáveis por authenticated (elas auto-gate via has_role/auth.uid).

DO $$
DECLARE
  fn text;
  trigger_or_maint text[] := ARRAY[
    'handle_new_user()',
    'handle_new_user_role()',
    'update_updated_at_column()',
    'update_rules_updated_at()',
    'bump_version()',
    'normalize_plate()',
    'validate_armed_by_email()',
    'validate_cdr_camera_org_consistency()',
    'audit_role_changes()',
    'prevent_audit_log_mutation()',
    'add_owner_on_org_create()',
    'array_days_valid(integer[])',
    'run_retention_cleanup()',
    'cleanup_edge_cache()',
    'cleanup_api_usage_logs()',
    'ensure_future_partitions(integer)',
    'run_index_maintenance()'
  ];
BEGIN
  FOREACH fn IN ARRAY trigger_or_maint LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      -- Ignora se a assinatura não existir (idempotência)
      NULL;
    END;
  END LOOP;
END $$;

-- Garante que service_role ainda pode invocar (cron/edge functions)
DO $$
DECLARE
  fn text;
  maint text[] := ARRAY[
    'run_retention_cleanup()',
    'cleanup_edge_cache()',
    'cleanup_api_usage_logs()',
    'ensure_future_partitions(integer)',
    'run_index_maintenance()'
  ];
BEGIN
  FOREACH fn IN ARRAY maint LOOP
    BEGIN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', fn);
    EXCEPTION WHEN undefined_function THEN NULL; END;
  END LOOP;
END $$;