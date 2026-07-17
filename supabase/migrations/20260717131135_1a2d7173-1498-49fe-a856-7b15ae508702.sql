
CREATE OR REPLACE FUNCTION public.get_csp_report_stats(_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  totals jsonb;
  by_directive jsonb;
  by_blocked jsonb;
  by_document jsonb;
  by_day jsonb;
  recent jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.' USING ERRCODE = '42501';
  END IF;

  IF _days IS NULL OR _days < 1 OR _days > 90 THEN _days := 7; END IF;

  SELECT jsonb_build_object(
    'total_reports', COUNT(*),
    'unique_directives', COUNT(DISTINCT COALESCE(effective_directive, violated_directive)),
    'unique_blocked', COUNT(DISTINCT blocked_uri),
    'unique_documents', COUNT(DISTINCT document_uri),
    'enforced', COUNT(*) FILTER (WHERE disposition = 'enforce'),
    'report_only', COUNT(*) FILTER (WHERE disposition = 'report')
  ) INTO totals
  FROM public.csp_violation_reports
  WHERE created_at > now() - make_interval(days => _days);

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO by_directive FROM (
    SELECT COALESCE(effective_directive, violated_directive, 'unknown') AS directive,
           COUNT(*) AS count
    FROM public.csp_violation_reports
    WHERE created_at > now() - make_interval(days => _days)
    GROUP BY 1
    ORDER BY count DESC
    LIMIT 20
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO by_blocked FROM (
    SELECT COALESCE(blocked_uri, 'inline') AS blocked_uri,
           COUNT(*) AS count,
           MAX(created_at) AS last_seen
    FROM public.csp_violation_reports
    WHERE created_at > now() - make_interval(days => _days)
    GROUP BY 1
    ORDER BY count DESC
    LIMIT 20
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO by_document FROM (
    SELECT COALESCE(document_uri, 'unknown') AS document_uri,
           COUNT(*) AS count
    FROM public.csp_violation_reports
    WHERE created_at > now() - make_interval(days => _days)
    GROUP BY 1
    ORDER BY count DESC
    LIMIT 20
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(d) ORDER BY d.day), '[]'::jsonb) INTO by_day FROM (
    SELECT date_trunc('day', created_at)::date AS day, COUNT(*) AS count
    FROM public.csp_violation_reports
    WHERE created_at > now() - make_interval(days => _days)
    GROUP BY 1
    ORDER BY 1
  ) d;

  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) INTO recent FROM (
    SELECT id, created_at, document_uri, blocked_uri,
           COALESCE(effective_directive, violated_directive) AS directive,
           source_file, line_number, disposition
    FROM public.csp_violation_reports
    ORDER BY created_at DESC
    LIMIT 50
  ) r;

  result := jsonb_build_object(
    'window_days', _days,
    'totals', totals,
    'by_directive', by_directive,
    'by_blocked', by_blocked,
    'by_document', by_document,
    'by_day', by_day,
    'recent', recent,
    'generated_at', now()
  );
  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_csp_report_stats(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_csp_report_stats(integer) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_csp_reports_created_at
  ON public.csp_violation_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_csp_reports_directive
  ON public.csp_violation_reports (effective_directive, created_at DESC);
