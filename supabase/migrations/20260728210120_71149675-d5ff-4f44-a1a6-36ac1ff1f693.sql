-- Correção: o LEFT JOIN LATERAL sobre jsonb_each multiplicava as linhas da
-- janela pelo número de baldes, inflando sum(total)/sum(admitted) (fan-out).
-- Totais e motivos passam a ser agregados em ramos independentes.
CREATE OR REPLACE FUNCTION public.admission_coverage(
  p_user_id uuid,
  p_source_ids text[],
  p_window_start timestamptz
)
RETURNS TABLE (source_id text, status text, dominant_reason text, total integer, admitted integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH universe AS (
    SELECT DISTINCT btrim(s) AS source_id
    FROM unnest(COALESCE(p_source_ids, ARRAY[]::text[])) AS s
    WHERE btrim(s) <> ''
    UNION
    SELECT w.source_id
    FROM public.admission_ledger_windows w
    WHERE w.user_id = p_user_id AND w.window_start >= p_window_start
  ),
  totals AS (
    SELECT w.source_id,
           sum(w.total)::integer AS total,
           sum(w.admitted)::integer AS admitted
    FROM public.admission_ledger_windows w
    WHERE w.user_id = p_user_id AND w.window_start >= p_window_start
    GROUP BY w.source_id
  ),
  reasons AS (
    SELECT w.source_id, e.key AS reason, sum((e.value #>> '{}')::integer)::integer AS n
    FROM public.admission_ledger_windows w
    CROSS JOIN LATERAL jsonb_each(w.counts) AS e(key, value)
    WHERE w.user_id = p_user_id AND w.window_start >= p_window_start
    GROUP BY w.source_id, e.key
  )
  SELECT u.source_id,
         CASE WHEN COALESCE(t.total, 0) = 0 THEN 'no_data'
              WHEN COALESCE(t.admitted, 0) > 0 THEN 'covered'
              ELSE 'gap' END AS status,
         CASE WHEN COALESCE(t.total, 0) = 0 OR COALESCE(t.admitted, 0) > 0 THEN NULL
              ELSE (SELECT r.reason FROM reasons r
                    WHERE r.source_id = u.source_id AND r.n > 0
                    ORDER BY r.n DESC,
                             array_position(ARRAY['admitted','admitted_degraded','indeterminate',
                                                  'out_of_window','inoperative','disabled',
                                                  'source_missing','no_scheme'], r.reason)
                    LIMIT 1) END AS dominant_reason,
         COALESCE(t.total, 0)::integer,
         COALESCE(t.admitted, 0)::integer
  FROM universe u
  LEFT JOIN totals t ON t.source_id = u.source_id
  ORDER BY u.source_id;
$$;

REVOKE ALL ON FUNCTION public.admission_coverage(uuid, text[], timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admission_coverage(uuid, text[], timestamptz) TO service_role;