BEGIN;

-- Fecha policies que anulam o isolamento por dono.
--
-- 1) FOR ALL com qual/with_check = true e role PUBLIC, herdadas do SQL legado, em
--    zones, zone_events, site_plans e site_plan_placements. Policies do mesmo
--    comando sao combinadas com OR, entao elas sobrescrevem as policies corretas
--    `user_id = auth.uid()`: qualquer usuario autenticado pode UPDATE e DELETE
--    linhas de outro dono.
--
-- 2) SELECT com USING (true) para `authenticated` em cameras e nas tabelas de
--    vigilancia: todo cliente le os registros dos outros. Todas ja tem policies
--    de dono, entao a leitura legitima continua funcionando.
--
-- Medido em producao (2026-11-27): zones 32 linhas, cameras 35 com 2 donos,
-- registered_persons 12, recognition_logs 250, plate_detections 100.
--
-- ROLLBACK: recriar as policies removidas.
--   CREATE POLICY "Allow all on zones" ON public.zones FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "Allow all on zone_events" ON public.zone_events FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "Anyone can view site_plans" ON public.site_plans FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "Anyone can view placements" ON public.site_plan_placements FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "allow_select_authenticated_cameras" ON public.cameras FOR SELECT TO authenticated USING (true);
--   CREATE POLICY "allow_select_authenticated_alerts" ON public.alerts FOR SELECT TO authenticated USING (true);
--   CREATE POLICY "allow_select_authenticated_analysis_history" ON public.analysis_history FOR SELECT TO authenticated USING (true);
--   CREATE POLICY "allow_select_authenticated_panic_events" ON public.panic_events FOR SELECT TO authenticated USING (true);
--   CREATE POLICY "allow_select_authenticated_plate_detections" ON public.plate_detections FOR SELECT TO authenticated USING (true);
--   CREATE POLICY "allow_select_authenticated_recognition_logs" ON public.recognition_logs FOR SELECT TO authenticated USING (true);
--   CREATE POLICY "allow_select_authenticated_registered_persons" ON public.registered_persons FOR SELECT TO authenticated USING (true);
--   CREATE POLICY "allow_select_authenticated_registered_plates" ON public.registered_plates FOR SELECT TO authenticated USING (true);
--   CREATE POLICY "allow_select_authenticated_zones" ON public.zones FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow all on zones" ON public.zones;
DROP POLICY IF EXISTS "Allow all on zone_events" ON public.zone_events;
DROP POLICY IF EXISTS "Anyone can view site_plans" ON public.site_plans;
DROP POLICY IF EXISTS "Anyone can view placements" ON public.site_plan_placements;

DROP POLICY IF EXISTS "allow_select_authenticated_cameras" ON public.cameras;
DROP POLICY IF EXISTS "allow_select_authenticated_alerts" ON public.alerts;
DROP POLICY IF EXISTS "allow_select_authenticated_analysis_history" ON public.analysis_history;
DROP POLICY IF EXISTS "allow_select_authenticated_panic_events" ON public.panic_events;
DROP POLICY IF EXISTS "allow_select_authenticated_plate_detections" ON public.plate_detections;
DROP POLICY IF EXISTS "allow_select_authenticated_recognition_logs" ON public.recognition_logs;
DROP POLICY IF EXISTS "allow_select_authenticated_registered_persons" ON public.registered_persons;
DROP POLICY IF EXISTS "allow_select_authenticated_registered_plates" ON public.registered_plates;
DROP POLICY IF EXISTS "allow_select_authenticated_zones" ON public.zones;

-- event_alerts nao tem policy baseada em dono; fechar a leitura sem definir quem
-- ve cada alerta deixaria a tabela inacessivel. Fica para a proxima migracao.

COMMIT;
