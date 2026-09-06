-- ROLLBACK:
--   BEGIN;
--   CREATE POLICY "Servico gerencia acoes de cura" ON public.agent_healing_actions FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "Servico gerencia varreduras de auto-cura" ON public.agent_healing_runs FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "relay_tasks_service_all" ON public.agent_relay_tasks FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "vault_audit_service_insert" ON public.camera_vault_audit FOR INSERT WITH CHECK (true);
--   CREATE POLICY "Service role manages escalations" ON public.cron_watchdog_escalations FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "Service role manages cron watchdog runs" ON public.cron_watchdog_runs FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "Service role manages CSP reports" ON public.csp_violation_reports FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "Service role manages snapshots" ON public.db_health_snapshots FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "service_role_writes_edge_errors" ON public.edge_function_error_audit FOR INSERT WITH CHECK (true);
--   CREATE POLICY "service_role manages fingerprint events" ON public.firmware_fingerprint_events FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "internal_cron_secrets_service_all" ON public.internal_cron_secrets FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "onvif_events_service_all" ON public.onvif_event_deliveries FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "onvif_subs_service_all" ON public.onvif_event_subscriptions FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "Service role manages partition maintenance runs" ON public.partition_maintenance_runs FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "rcc_runs_service_all" ON public.root_cause_correlation_runs FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "Service role manages tiering runs" ON public.storage_tiering_runs FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "hc_service_all" ON public.stream_health_checks FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "sre_service_all" ON public.stream_restart_events FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "Service role manages suppressions" ON public.test_mode_suppressions FOR ALL USING (true) WITH CHECK (true);
--   COMMIT;

-- Contexto: 19 tabelas tinham, cada uma, uma policy "service role manages X"
-- (FOR ALL USING (true) WITH CHECK (true), ou FOR INSERT WITH CHECK (true))
-- pensada para permitir acesso do backend. Essa policy nunca teve efeito
-- nenhum sobre service_role — confirmado via `SELECT rolbypassrls FROM
-- pg_roles`, service_role já tem rolbypassrls=true e ignora RLS
-- inteiramente, em qualquer tabela, sem precisar de policy alguma.
--
-- O efeito real dessas 19 policies era outro: como RLS aplica OR entre
-- policies permissivas, "USING (true)" também liberava a tabela para
-- QUALQUER usuário com o papel `authenticated` (todas as 19 tinham GRANT de
-- tabela para authenticated), mesmo quando a MESMA tabela já tinha uma
-- policy própria e corretamente restrita (has_role(auth.uid(),'admin') ou
-- auth.uid() = user_id) para o mesmo tipo de acesso. A policy "correta"
-- nunca fazia diferença, porque a policy permissiva já liberava tudo.
--
-- Caso mais grave: internal_cron_secrets.secret guarda valores reais em
-- texto puro e só tinha a policy permissiva — qualquer usuário autenticado
-- podia ler todos os segredos via
-- `supabase.from('internal_cron_secrets').select('*')`.
--
-- Nenhuma tabela aqui perde funcionalidade legítima: todas já têm uma
-- policy própria e correta para o acesso que de fato é usado (confirmado
-- caso a caso contra o uso real no frontend, arquivo por arquivo, antes
-- desta migration) — as telas admin em questão (/operations) já exigem
-- minRole="admin" na própria rota, e os proprietários de dados
-- (stream_health_checks, stream_restart_events, agent_relay_tasks,
-- firmware_fingerprint_events, onvif_event_*) continuam liberados para o
-- próprio usuário via `auth.uid() = user_id`.
BEGIN;

DROP POLICY IF EXISTS "Servico gerencia acoes de cura" ON public.agent_healing_actions;
DROP POLICY IF EXISTS "Servico gerencia varreduras de auto-cura" ON public.agent_healing_runs;
DROP POLICY IF EXISTS "relay_tasks_service_all" ON public.agent_relay_tasks;
DROP POLICY IF EXISTS "vault_audit_service_insert" ON public.camera_vault_audit;
DROP POLICY IF EXISTS "Service role manages escalations" ON public.cron_watchdog_escalations;
DROP POLICY IF EXISTS "Service role manages cron watchdog runs" ON public.cron_watchdog_runs;
DROP POLICY IF EXISTS "Service role manages CSP reports" ON public.csp_violation_reports;
DROP POLICY IF EXISTS "Service role manages snapshots" ON public.db_health_snapshots;
DROP POLICY IF EXISTS "service_role_writes_edge_errors" ON public.edge_function_error_audit;
DROP POLICY IF EXISTS "service_role manages fingerprint events" ON public.firmware_fingerprint_events;
DROP POLICY IF EXISTS "internal_cron_secrets_service_all" ON public.internal_cron_secrets;
DROP POLICY IF EXISTS "onvif_events_service_all" ON public.onvif_event_deliveries;
DROP POLICY IF EXISTS "onvif_subs_service_all" ON public.onvif_event_subscriptions;
DROP POLICY IF EXISTS "Service role manages partition maintenance runs" ON public.partition_maintenance_runs;
DROP POLICY IF EXISTS "rcc_runs_service_all" ON public.root_cause_correlation_runs;
DROP POLICY IF EXISTS "Service role manages tiering runs" ON public.storage_tiering_runs;
DROP POLICY IF EXISTS "hc_service_all" ON public.stream_health_checks;
DROP POLICY IF EXISTS "sre_service_all" ON public.stream_restart_events;
DROP POLICY IF EXISTS "Service role manages suppressions" ON public.test_mode_suppressions;

COMMIT;
