BEGIN;

-- Fecha duas lacunas do expurgo LGPD que sobraram da 20261126233000.
--
--   1. `face_recognition_configs` guarda preferencia de reconhecimento facial
--      por `user_id`, e a unica FK dela e por `camera_id` (ON DELETE CASCADE).
--      O registro salvo em Configuracoes nao tem camera: nada cascateava e o
--      expurgo nao o tocava, entao o dado biologico continuava vinculado ao
--      identificador de quem teve a conta excluida.
--
--   2. `alertmanager_silences_audit` era `actor_user_id uuid NOT NULL REFERENCES
--      auth.users(id) ON DELETE RESTRICT` com RLS sem DELETE (trilha imutavel,
--      migration 20260721181802). O expurgo apagava a trilha do titular para
--      conseguir remover a conta, o que permite a um admin que silenciou
--      alertas apagar o proprio rastro. Aqui a trilha deixa de ser destrutivel
--      justamente quando importa: `actor_user_id` passa a aceitar NULL com
--      ON DELETE SET NULL e o expurgo ANONIMIZA a linha (zera o vinculo com a
--      pessoa e o comentario livre), preservando acao, matchers, duracao e
--      horario como evidencia operacional sem dado pessoal.

ALTER TABLE public.alertmanager_silences_audit
  ALTER COLUMN actor_user_id DROP NOT NULL;

ALTER TABLE public.alertmanager_silences_audit
  DROP CONSTRAINT IF EXISTS alertmanager_silences_audit_actor_user_id_fkey;

ALTER TABLE public.alertmanager_silences_audit
  ADD CONSTRAINT alertmanager_silences_audit_actor_user_id_fkey
  FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.alertmanager_silences_audit.actor_user_id IS
  'Autor do silenciamento. Vira NULL quando a conta e excluida (LGPD) - a trilha permanece anonimizada.';

-- `delete_user_data` reescrita: mesmos grupos da 20261126233000, mais
-- `face_recognition_configs` (dado biologico) e a trilha de silenciamentos
-- anonimizada em vez de apagada.
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

  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, details)
  VALUES(caller_id, 'user.delete_request', 'user', _target_user_id,
         jsonb_build_object('reason','LGPD request','deleted_by', caller_id,
                            'privileged_path', auth.uid() IS NULL));

  -- GRUPO 1: Tabelas com cascade automatico via FK (deletar roots basta)
  DELETE FROM public.cameras WHERE user_id = _target_user_id;
  DELETE FROM public.registered_persons WHERE user_id = _target_user_id;
  DELETE FROM public.rules WHERE user_id = _target_user_id;
  DELETE FROM public.alerts WHERE user_id = _target_user_id;

  -- GRUPO 2: Tabelas LGPD orfas (sem cascade path)
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
  DELETE FROM public.face_recognition_configs WHERE user_id = _target_user_id;
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

  -- GRUPO 2b: FKs para auth.users que nao cascateiam e bloqueavam o
  -- `auth.admin.deleteUser` depois dos dados ja apagados.
  DELETE FROM public.ppe_violations WHERE acknowledged_by = _target_user_id;
  DELETE FROM public.ppe_configs WHERE user_id = _target_user_id;
  DELETE FROM public.ppe_zones WHERE user_id = _target_user_id;
  DELETE FROM public.test_mode_sessions WHERE created_by = _target_user_id;
  -- A trilha e preservada como evidencia operacional do silenciamento, mas todo
  -- campo que identifica o titular (ou que ele digitou) sai: actor_user_id,
  -- actor_email, ip_address, user_agent, comment e justification sao dado
  -- pessoal. action, matchers, duration_minutes, status, silence_id,
  -- request_id e error_message ficam (nao identificam ninguem).
  UPDATE public.alertmanager_silences_audit
     SET actor_user_id = NULL,
         actor_email   = NULL,
         ip_address    = NULL,
         user_agent    = NULL,
         comment       = NULL,
         justification = NULL
   WHERE actor_user_id = _target_user_id;

  -- GRUPO 2c: dados do titular que nao passam por nenhum cascade
  DELETE FROM public.behavior_analyses WHERE user_id = _target_user_id;

  -- GRUPO 3: Tabelas root de perfil (deletar por ultimo)
  DELETE FROM public.user_roles WHERE user_id = _target_user_id;
  DELETE FROM public.profiles WHERE user_id = _target_user_id;
END;
$function$;

COMMENT ON FUNCTION public.delete_user_data(uuid) IS
  'Exclusao de conta (LGPD). Aceita JWT do proprio titular ou chamada privilegiada (service_role) que informa o alvo. Preserva a trilha de silenciamentos anonimizada.';

REVOKE ALL ON FUNCTION public.delete_user_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(uuid) TO service_role;

-- ROLLBACK:
--   1. Reaplicar supabase/migrations/20261126233000_delete_user_data_identidade_privilegiada.sql
--      (devolve o corpo sem face_recognition_configs e com DELETE na trilha em vez de UPDATE).
--   2. Desfazer a FK anulavel, so se nao houver linha anonimizada:
--        SELECT count(*) FROM public.alertmanager_silences_audit WHERE actor_user_id IS NULL;
--        UPDATE public.alertmanager_silences_audit SET actor_user_id = <autor original> WHERE actor_user_id IS NULL; -- nao recuperavel
--      Linhas ja anonimizadas perderam o vinculo de forma irreversivel; reverter o NOT NULL
--      exige decidir o que fazer com elas (manter ou apagar a trilha inteira).
--        ALTER TABLE public.alertmanager_silences_audit DROP CONSTRAINT IF EXISTS alertmanager_silences_audit_actor_user_id_fkey;
--        ALTER TABLE public.alertmanager_silences_audit
--          ADD CONSTRAINT alertmanager_silences_audit_actor_user_id_fkey
--          FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
--        ALTER TABLE public.alertmanager_silences_audit ALTER COLUMN actor_user_id SET NOT NULL;
--      Sem isso, excluir conta com trilha de silenciamento volta a ser bloqueado
--      pela FK RESTRICT apos os dados ja terem sido apagados.

COMMIT;