-- =====================================================================
-- VISÃO v2 — Fix DEFINITIVO de RLS permissiva para todas as tabelas
-- relevantes do módulo Inteligência + Gestão.
-- Roda no SQL Editor: https://supabase.com/dashboard/project/pmzxbffnbenkmzpnbehb/sql/new
-- =====================================================================

-- Helper: remove todas as policies de SELECT de uma tabela e cria uma
-- permissiva para authenticated E anon.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'registered_persons',
    'recognition_logs',
    'registered_plates',
    'plate_detections',
    'zones',
    'zone_events',
    'analysis_history',
    'event_alerts',
    'panic_events',
    'cameras',
    'alerts'
  ];
  p record;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      CONTINUE;
    END IF;

    -- Garante RLS habilitado (sem isso policies não aplicam)
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Remove TODAS as policies existentes de SELECT
    FOR p IN
      SELECT policyname FROM pg_policies
       WHERE schemaname = 'public' AND tablename = t AND cmd = 'SELECT'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;

    -- Cria policy permissiva de SELECT para authenticated
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
      'allow_select_authenticated_' || t, t
    );

    -- Cria policy permissiva de SELECT para anon (caso a app use anon key)
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO anon USING (true)',
      'allow_select_anon_' || t, t
    );
  END LOOP;
END$$;

SELECT 'Policies permissivas criadas' AS status;
