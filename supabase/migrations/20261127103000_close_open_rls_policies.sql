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
-- 3) SELECT com USING (true) para `anon` nas mesmas tabelas de vigilancia. Hoje
--    `anon` nao tem GRANT em public, entao elas sao inertes; saem junto para que
--    um GRANT futuro nao reabra a leitura anonima de dados de todos os clientes.
--
-- 4) SELECT com USING (true) para PUBLIC que tambem anulam isolamento por orgao:
--    collab_networks, collab_memberships e collab_invitations tem policy por
--    `collab_user_orgs(auth.uid())` e a aberta as anula. Em ppe_violations a
--    leitura e o UPDATE sao abertos (`Anyone can view`, `Users can update`).
--
-- Medido em producao (2026-11-27): zones 32 linhas, cameras 35 com 2 donos,
-- registered_persons 12, recognition_logs 250, plate_detections 100,
-- collab_networks 2 (1 orgao), collab_invitations 3 (2 orgaos),
-- ppe_violations 12 (3 cameras).
--
-- Fica de fora: event_alerts (nao tem policy baseada em dono; fechar sem definir
-- quem ve cada alerta deixaria a tabela inacessivel).
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
--   CREATE POLICY "allow_select_authenticated_zone_events" ON public.zone_events FOR SELECT TO authenticated USING (true);
--   CREATE POLICY "allow_select_anon_cameras" ON public.cameras FOR SELECT TO anon USING (true);
--   CREATE POLICY "allow_select_anon_alerts" ON public.alerts FOR SELECT TO anon USING (true);
--   CREATE POLICY "allow_select_anon_analysis_history" ON public.analysis_history FOR SELECT TO anon USING (true);
--   CREATE POLICY "allow_select_anon_panic_events" ON public.panic_events FOR SELECT TO anon USING (true);
--   CREATE POLICY "allow_select_anon_plate_detections" ON public.plate_detections FOR SELECT TO anon USING (true);
--   CREATE POLICY "allow_select_anon_recognition_logs" ON public.recognition_logs FOR SELECT TO anon USING (true);
--   CREATE POLICY "allow_select_anon_registered_persons" ON public.registered_persons FOR SELECT TO anon USING (true);
--   CREATE POLICY "allow_select_anon_registered_plates" ON public.registered_plates FOR SELECT TO anon USING (true);
--   CREATE POLICY "allow_select_anon_zones" ON public.zones FOR SELECT TO anon USING (true);
--   CREATE POLICY "allow_select_anon_zone_events" ON public.zone_events FOR SELECT TO anon USING (true);
--   CREATE POLICY "Users can view own networks" ON public.collab_networks FOR SELECT TO public USING (true);
--   CREATE POLICY "Users can view memberships" ON public.collab_memberships FOR SELECT TO public USING (true);
--   CREATE POLICY "Users can view invitations" ON public.collab_invitations FOR SELECT TO public USING (true);
--   CREATE POLICY "Anyone can view ppe_violations" ON public.ppe_violations FOR SELECT TO public USING (true);
--   CREATE POLICY "Users can update ppe_violations" ON public.ppe_violations FOR UPDATE TO public USING (true);
--   DROP POLICY "Users can view violations of own cameras" ON public.ppe_violations;
--   DROP POLICY "Users can acknowledge violations of own cameras" ON public.ppe_violations;

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
DROP POLICY IF EXISTS "allow_select_authenticated_zone_events" ON public.zone_events;

-- `anon` nao tem GRANT em public hoje; saem para nao reabrirem com um GRANT futuro.
DROP POLICY IF EXISTS "allow_select_anon_cameras" ON public.cameras;
DROP POLICY IF EXISTS "allow_select_anon_alerts" ON public.alerts;
DROP POLICY IF EXISTS "allow_select_anon_analysis_history" ON public.analysis_history;
DROP POLICY IF EXISTS "allow_select_anon_panic_events" ON public.panic_events;
DROP POLICY IF EXISTS "allow_select_anon_plate_detections" ON public.plate_detections;
DROP POLICY IF EXISTS "allow_select_anon_recognition_logs" ON public.recognition_logs;
DROP POLICY IF EXISTS "allow_select_anon_registered_persons" ON public.registered_persons;
DROP POLICY IF EXISTS "allow_select_anon_registered_plates" ON public.registered_plates;
DROP POLICY IF EXISTS "allow_select_anon_zones" ON public.zones;
DROP POLICY IF EXISTS "allow_select_anon_zone_events" ON public.zone_events;

-- Isolamento por orgao anulado por policy aberta para PUBLIC. As tres tabelas
-- mantem a policy propria (collab_user_orgs), que passa a ser a unica.
DROP POLICY IF EXISTS "Users can view own networks" ON public.collab_networks;
DROP POLICY IF EXISTS "Users can view memberships" ON public.collab_memberships;
DROP POLICY IF EXISTS "Users can view invitations" ON public.collab_invitations;

-- ppe_violations nao tem outra policy: fechar sem criar a de dono deixaria a
-- tabela inacessivel. O dono vem da camera; as 12 linhas atuais todas tem
-- camera_id resolvendo para uma camera com user_id.
DROP POLICY IF EXISTS "Anyone can view ppe_violations" ON public.ppe_violations;
DROP POLICY IF EXISTS "Users can update ppe_violations" ON public.ppe_violations;

CREATE POLICY "Users can view violations of own cameras" ON public.ppe_violations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cameras c WHERE c.id = ppe_violations.camera_id AND c.user_id = auth.uid()));

CREATE POLICY "Users can acknowledge violations of own cameras" ON public.ppe_violations
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cameras c WHERE c.id = ppe_violations.camera_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cameras c WHERE c.id = ppe_violations.camera_id AND c.user_id = auth.uid()));

COMMIT;
