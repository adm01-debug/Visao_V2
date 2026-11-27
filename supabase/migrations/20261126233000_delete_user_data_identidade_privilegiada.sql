BEGIN;

-- Exclusão de conta (LGPD) passa a funcionar quando chamada pela Edge Function.
--
-- Sintoma real: `delete-my-account` roda com a service role e chama
-- `delete_user_data(_target_user_id)`. Nesse contexto `auth.uid()` é NULL, então
-- a primeira escrita da função — `audit_logs(user_id, ...)` — violava
-- `audit_logs.user_id NOT NULL`. A transação abortava ANTES de qualquer DELETE:
-- nem os dados eram apagados, nem o usuário da Auth era removido, e o titular
-- recebia erro. Como a tela de exclusão é nova, ninguém tinha exercitado o
-- caminho até agora.
--
-- Duas correções:
--   1. A identidade usada na auditoria é `coalesce(auth.uid(), _target_user_id)`.
--      Quem chama com JWT continua restrito à própria conta (o guard segue
--      valendo); quem chama com service role já é privilegiado e escolhe o alvo,
--      então o alvo é a identidade correta a registrar.
--   2. Tabelas de negócio com FK para `auth.users` sem ON DELETE CASCADE
--      bloqueavam o `auth.admin.deleteUser` DEPOIS que os dados já tinham sido
--      apagados (conta meio-excluída). `ppe_*`, `alertmanager_silences_audit`
--      (`ON DELETE RESTRICT`) e `test_mode_sessions.created_by` passam a ser
--      limpos aqui.
--
-- `CREATE OR REPLACE` preserva o ACL; o REVOKE/GRANT é reafirmado abaixo porque
-- recriação por outro agente já reabriu função para `anon` neste repositório.

CREATE OR REPLACE FUNCTION public.delete_user_data(_target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE caller_id uuid;
BEGIN
  caller_id := coalesce(auth.uid(), _target_user_id);
  IF auth.uid() IS NOT NULL
     AND auth.uid() <> _target_user_id
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Você só pode excluir sua própria conta.';
  END IF;

  -- Auditoria antes da exclusão
  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, details)
  VALUES(caller_id, 'user.delete_request', 'user', _target_user_id,
         jsonb_build_object('reason','LGPD request','deleted_by', caller_id,
                            'privileged_path', auth.uid() IS NULL));

  -- GRUPO 1: Tabelas com cascade automático via FK (deletar roots basta)
  DELETE FROM public.cameras WHERE user_id = _target_user_id;
  DELETE FROM public.registered_persons WHERE user_id = _target_user_id;
  DELETE FROM public.rules WHERE user_id = _target_user_id;
  DELETE FROM public.alerts WHERE user_id = _target_user_id;

  -- GRUPO 2: Tabelas LGPD órfãs (sem cascade path)
  DELETE FROM public.admission_ledger_windows WHERE user_id = _target_user_id;
  DELETE FROM public.agent_discoveries WHERE user_id = _target_user_id;
  DELETE FROM public.agent_healing_actions WHERE user_id = _target_user_id;
  DELETE FROM public.agent_relay_tasks WHERE user_id = _target_user_id;
  DELETE FROM public.alarm_schemes WHERE user_id = _target_user_id;
  DELETE FROM public.api_usage_logs WHERE user_id = _target_user_id;
  DELETE FROM public.camera_schedule_runs WHERE user_id = _target_user_id;
  DELETE FROM public.collab_notification_reads WHERE user_id = _target_user_id;
  DELETE FROM public.collab_notification_silences WHERE user_id = _target_user_id;
  DELETE FROM public.connectivity_resolution_telemetry WHERE user_id = _target_user_id;
  DELETE FROM public.detection_reviews WHERE user_id = _target_user_id;
  DELETE FROM public.device_registrations WHERE user_id = _target_user_id;
  DELETE FROM public.device_remote_commands WHERE user_id = _target_user_id;
  DELETE FROM public.dry_run_report_snapshots WHERE user_id = _target_user_id;
  DELETE FROM public.firmware_fingerprint_events WHERE user_id = _target_user_id;
  DELETE FROM public.local_agents WHERE user_id = _target_user_id;
  DELETE FROM public.model_thresholds WHERE user_id = _target_user_id;
  DELETE FROM public.monitor_groups WHERE user_id = _target_user_id;
  DELETE FROM public.monitoring_center_accounts WHERE user_id = _target_user_id;
  DELETE FROM public.monitoring_center_dispatches WHERE user_id = _target_user_id;
  DELETE FROM public.notification_configs WHERE user_id = _target_user_id;
  DELETE FROM public.notification_dispatches WHERE user_id = _target_user_id;
  DELETE FROM public.notification_recipients WHERE user_id = _target_user_id;
  DELETE FROM public.nvr_recording_downloads WHERE user_id = _target_user_id;
  DELETE FROM public.nvrs WHERE user_id = _target_user_id;
  DELETE FROM public.organization_members WHERE user_id = _target_user_id;
  DELETE FROM public.panic_events WHERE user_id = _target_user_id;
  DELETE FROM public.plate_detections WHERE user_id = _target_user_id;
  DELETE FROM public.preview_telemetry_events WHERE user_id = _target_user_id;
  DELETE FROM public.productivity_metric_preferences WHERE user_id = _target_user_id;
  DELETE FROM public.ptz_preflight_runs WHERE user_id = _target_user_id;
  DELETE FROM public.query_telemetry WHERE user_id = _target_user_id;
  DELETE FROM public.recognition_logs WHERE user_id = _target_user_id;
  DELETE FROM public.registered_plates WHERE user_id = _target_user_id;
  DELETE FROM public.rtsp_preview_sessions WHERE user_id = _target_user_id;
  DELETE FROM public.site_plans WHERE user_id = _target_user_id;
  DELETE FROM public.test_mode_sessions WHERE user_id = _target_user_id;
  DELETE FROM public.test_mode_suppressions WHERE user_id = _target_user_id;
  DELETE FROM public.user_capability_grants WHERE user_id = _target_user_id;
  DELETE FROM public.user_filter_preferences WHERE user_id = _target_user_id;
  DELETE FROM public.vehicles WHERE user_id = _target_user_id;
  DELETE FROM public.wizard_telemetry WHERE user_id = _target_user_id;
  DELETE FROM public.zone_events WHERE user_id = _target_user_id;

  -- GRUPO 2b: FKs para auth.users que não cascateiam e bloqueavam o
  -- `auth.admin.deleteUser` depois dos dados já apagados.
  DELETE FROM public.ppe_violations WHERE acknowledged_by = _target_user_id;
  DELETE FROM public.ppe_configs WHERE user_id = _target_user_id;
  DELETE FROM public.ppe_zones WHERE user_id = _target_user_id;
  DELETE FROM public.test_mode_sessions WHERE created_by = _target_user_id;
  DELETE FROM public.alertmanager_silences_audit WHERE actor_user_id = _target_user_id;

  -- GRUPO 2c: dados do titular que não passam por nenhum cascade e ficariam
  -- para trás (auditoria de completude: 100 linhas reais de um único titular em
  -- behavior_analyses, incluindo URLs de imagem). `camera_bandwidth_hourly` é
  -- view sobre `camera_bandwidth_samples`, que cascateia por `cameras`.
  DELETE FROM public.behavior_analyses WHERE user_id = _target_user_id;

  -- GRUPO 3: Tabelas root de perfil (deletar por último)
  DELETE FROM public.user_roles WHERE user_id = _target_user_id;
  DELETE FROM public.profiles WHERE user_id = _target_user_id;
END;
$function$;

COMMENT ON FUNCTION public.delete_user_data(uuid) IS
  'Exclusao de conta (LGPD). Aceita JWT do proprio titular ou chamada privilegiada (service_role) que informa o alvo.';

REVOKE ALL ON FUNCTION public.delete_user_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(uuid) TO service_role;

-- ROLLBACK:
--   Devolve `delete_user_data` ao corpo anterior (identidade = auth.uid() e sem
--   os grupos 2b/2c), reaplicando a funcao de
--   supabase/migrations/20260513172507_a273368b-18d4-44e8-a3d2-93256a18cab5.sql
--   e reafirmando o ACL:
--     REVOKE ALL ON FUNCTION public.delete_user_data(uuid) FROM PUBLIC, anon, authenticated;
--     GRANT EXECUTE ON FUNCTION public.delete_user_data(uuid) TO service_role;
--   Sem isso, excluir conta pela Edge Function volta a abortar na auditoria
--   (audit_logs.user_id NOT NULL) e a conta nunca e apagada.

COMMIT;
