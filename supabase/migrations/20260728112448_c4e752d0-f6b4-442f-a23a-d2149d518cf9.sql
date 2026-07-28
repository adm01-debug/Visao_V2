CREATE OR REPLACE FUNCTION public.list_alarm_recurrence_series(
  p_organization_id uuid,
  p_now timestamptz DEFAULT now(),
  p_window_ms bigint DEFAULT 3600000,
  p_chatter_max_ms bigint DEFAULT 30000,
  p_limit integer DEFAULT 200
)
RETURNS TABLE(
  series_key text,
  episodes_in_window integer,
  chatter_in_window integer,
  total_episodes integer,
  peak_severity text,
  is_open boolean,
  last_opened_at timestamptz,
  last_closed_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_now timestamptz := coalesce(p_now, now());
  v_window bigint := GREATEST(coalesce(p_window_ms, 3600000), 1);
  v_chatter_ms bigint := GREATEST(coalesce(p_chatter_max_ms, 30000), 0);
  v_limit int := LEAST(GREATEST(coalesce(p_limit, 200), 1), 500);
  v_from timestamptz;
BEGIN
  IF v_actor IS NULL OR NOT public.is_org_member(p_organization_id, v_actor) THEN
    RAISE EXCEPTION 'sem acesso a esta organização' USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_from := v_now - make_interval(secs => v_window / 1000.0);

  RETURN QUERY
  WITH scoped AS (
    SELECT e.series_key,
           e.severity,
           e.opened_at,
           e.closed_at,
           e.duration_ms,
           -- Um episódio "toca a janela" se ainda estava aberto dentro dela;
           -- contar só pela abertura esconderia alarme longo em curso.
           (coalesce(e.closed_at, v_now) >= v_from AND e.opened_at <= v_now) AS in_window
      FROM public.alarm_recurrence_episodes e
     WHERE e.organization_id = p_organization_id
  )
  SELECT s.series_key,
         count(*) FILTER (WHERE s.in_window)::int,
         count(*) FILTER (
           WHERE s.in_window
             AND s.closed_at IS NOT NULL
             AND s.duration_ms IS NOT NULL
             AND s.duration_ms < v_chatter_ms
         )::int,
         count(*)::int,
         (
           SELECT x.severity::text
             FROM scoped x
            WHERE x.series_key = s.series_key AND x.in_window
            ORDER BY CASE x.severity
                       WHEN 'critical' THEN 3
                       WHEN 'high' THEN 2
                       WHEN 'medium' THEN 1
                       ELSE 0
                     END DESC,
                     x.opened_at DESC
            LIMIT 1
         ),
         bool_or(s.closed_at IS NULL),
         max(s.opened_at),
         max(s.closed_at)
    FROM scoped s
   GROUP BY s.series_key
  HAVING count(*) FILTER (WHERE s.in_window) > 0 OR bool_or(s.closed_at IS NULL)
   ORDER BY count(*) FILTER (WHERE s.in_window) DESC, s.series_key ASC
   LIMIT v_limit;
END;
$function$;

REVOKE ALL ON FUNCTION public.list_alarm_recurrence_series(uuid, timestamptz, bigint, bigint, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_alarm_recurrence_series(uuid, timestamptz, bigint, bigint, integer) TO authenticated;