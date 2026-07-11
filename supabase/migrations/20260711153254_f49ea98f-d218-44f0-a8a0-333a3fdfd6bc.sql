-- ============================================================
-- ONDA 1 (P0) — Endurecimento de segurança
-- ============================================================

-- 1. Revogar EXECUTE público de todas as funções SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_role_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_armed_by_email() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_user_data(uuid) FROM PUBLIC, anon;

-- 2. Conceder EXECUTE apenas onde necessário
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(uuid) TO authenticated;

-- 3. Políticas RLS explícitas nas partições de plate_detections
DO $$
DECLARE
  part text;
BEGIN
  FOREACH part IN ARRAY ARRAY[
    'plate_detections_m2026_05',
    'plate_detections_m2026_06',
    'plate_detections_m2026_07',
    'plate_detections_y2025_y2026_pre'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', part);
    EXECUTE format('DROP POLICY IF EXISTS "Users manage own plate detections" ON public.%I', part);
    EXECUTE format(
      'CREATE POLICY "Users manage own plate detections" ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
      part
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', part);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', part);
  END LOOP;
END $$;

-- 4. Políticas RLS explícitas nas partições de recognition_logs
DO $$
DECLARE
  part text;
BEGIN
  FOREACH part IN ARRAY ARRAY[
    'recognition_logs_m2026_05',
    'recognition_logs_m2026_06',
    'recognition_logs_m2026_07',
    'recognition_logs_y2025_y2026_pre'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', part);
    EXECUTE format('DROP POLICY IF EXISTS "Users manage own recognition logs" ON public.%I', part);
    EXECUTE format(
      'CREATE POLICY "Users manage own recognition logs" ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
      part
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', part);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', part);
  END LOOP;
END $$;

-- 5. idempotency_keys: tabela interna, deny-all para anon/authenticated
REVOKE ALL ON public.idempotency_keys FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.idempotency_keys TO service_role;
COMMENT ON TABLE public.idempotency_keys IS 'Tabela interna gerenciada apenas por funções administrativas/edge functions via service_role. Sem acesso via API pública.';
