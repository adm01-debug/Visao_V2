-- Onda 105 — Escopo explícito TO authenticated nas políticas ainda ligadas ao papel PUBLIC.
-- Todas já filtram por auth.uid(); o papel PUBLIC apenas amplia a superfície desnecessariamente.

-- dry_run_report_snapshots
DROP POLICY IF EXISTS "Admins view all dry-run snapshots" ON public.dry_run_report_snapshots;
CREATE POLICY "Admins view all dry-run snapshots" ON public.dry_run_report_snapshots
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users manage own dry-run snapshots" ON public.dry_run_report_snapshots;
CREATE POLICY "Users manage own dry-run snapshots" ON public.dry_run_report_snapshots
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- stream_alert_thresholds
DROP POLICY IF EXISTS "Users manage own thresholds" ON public.stream_alert_thresholds;
CREATE POLICY "Users manage own thresholds" ON public.stream_alert_thresholds
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- plate_detections (tabela particionada)
DROP POLICY IF EXISTS "Users can view their own plate detections" ON public.plate_detections;
CREATE POLICY "Users can view their own plate detections" ON public.plate_detections
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own plate detections" ON public.plate_detections;
CREATE POLICY "Users can insert their own plate detections" ON public.plate_detections
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own plate detections" ON public.plate_detections;
CREATE POLICY "Users can update their own plate detections" ON public.plate_detections
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own plate detections" ON public.plate_detections;
CREATE POLICY "Users can delete their own plate detections" ON public.plate_detections
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- recognition_logs (tabela particionada)
DROP POLICY IF EXISTS "Users can view their own recognition logs" ON public.recognition_logs;
CREATE POLICY "Users can view their own recognition logs" ON public.recognition_logs
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own recognition logs" ON public.recognition_logs;
CREATE POLICY "Users can insert their own recognition logs" ON public.recognition_logs
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own recognition logs" ON public.recognition_logs;
CREATE POLICY "Users can update their own recognition logs" ON public.recognition_logs
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own recognition logs" ON public.recognition_logs;
CREATE POLICY "Users can delete their own recognition logs" ON public.recognition_logs
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Auditor de políticas permissivas: eliminar falsos positivos.
-- Políticas de INSERT não possuem cláusula USING por definição — sinalizá-las
-- como "warn" gerava ruído. Agora só é permissiva de fato quando a expressão
-- efetiva (USING ou WITH CHECK) é irrestrita para papéis não-service_role.
CREATE OR REPLACE FUNCTION public.get_permissive_rls_policies()
RETURNS TABLE(schemaname text, tablename text, policyname text, cmd text, roles text[], qual text, with_check text, severity text, recommendation text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'access denied: admin role required';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT
      p.schemaname::text AS schemaname,
      p.tablename::text  AS tablename,
      p.policyname::text AS policyname,
      p.cmd::text        AS cmd,
      p.roles::text[]    AS roles,
      p.qual             AS qual,
      p.with_check       AS with_check,
      -- service_role legitimamente ignora escopo por usuário
      (p.roles::text[] <@ ARRAY['service_role']) AS is_service_only,
      -- expressão irrestrita: USING (true) ou WITH CHECK (true)
      (p.qual = 'true' OR p.with_check = 'true') AS unrestricted,
      -- comando de leitura/escrita sem nenhuma expressão aplicável
      (p.cmd <> 'INSERT' AND p.qual IS NULL) AS missing_using,
      ('anon' = ANY(p.roles) OR 'public' = ANY(p.roles)) AS public_facing
    FROM pg_policies p
    WHERE p.schemaname = 'public'
  )
  SELECT
    c.schemaname,
    c.tablename,
    c.policyname,
    c.cmd,
    c.roles,
    COALESCE(c.qual, '')::text,
    COALESCE(c.with_check, '')::text,
    CASE
      WHEN c.unrestricted AND c.public_facing THEN 'critical'
      WHEN c.unrestricted AND c.tablename IN ('user_roles','audit_logs','csp_violation_reports','profiles') THEN 'critical'
      WHEN c.unrestricted THEN 'warn'
      WHEN c.missing_using THEN 'warn'
      ELSE 'info'
    END::text,
    CASE
      WHEN c.unrestricted THEN 'Substituir expressão irrestrita (true) por filtro com auth.uid() ou has_role()'
      WHEN c.missing_using THEN 'Adicionar cláusula USING explícita'
      ELSE 'Restringir a política a papéis explícitos (TO authenticated) em vez de PUBLIC'
    END::text
  FROM candidates c
  WHERE NOT c.is_service_only
    AND (c.unrestricted OR c.missing_using OR c.public_facing)
  ORDER BY
    CASE
      WHEN c.unrestricted AND c.public_facing THEN 1
      WHEN c.unrestricted THEN 2
      WHEN c.missing_using THEN 3
      ELSE 4
    END,
    c.tablename,
    c.policyname;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_permissive_rls_policies() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_permissive_rls_policies() TO authenticated;