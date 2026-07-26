CREATE OR REPLACE FUNCTION public.evaluate_vehicle_recurrence(
  _window_minutes int DEFAULT NULL,
  _min_passes     int DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pol      record;
  win_min  int;
  min_pass int;
  rec      record;
  emitted  int := 0;
  skipped  int := 0;
BEGIN
  PERFORM set_config('statement_timeout', '30s', true);
  SELECT * INTO pol FROM public.vehicle_recurrence_policy();
  win_min  := GREATEST(COALESCE(_window_minutes, pol.window_minutes), 1);
  min_pass := GREATEST(COALESCE(_min_passes, pol.min_passes), 2);

  FOR rec IN
    WITH reads AS (
      SELECT d.user_id,
             upper(trim(d.plate)) AS plate,
             d.camera_id,
             d.camera_name,
             COALESCE(d."timestamp", d.created_at) AS seen_at
        FROM public.plate_detections d
       WHERE COALESCE(d."timestamp", d.created_at) > now() - make_interval(mins => win_min)
         AND d.plate IS NOT NULL
         AND length(trim(d.plate)) >= 5
         AND COALESCE(d.confidence, 0) >= pol.min_confidence
    ),
    marked AS (
      SELECT r.*,
             CASE
               WHEN lag(r.seen_at) OVER (PARTITION BY r.user_id, r.plate ORDER BY r.seen_at) IS NULL
                 OR r.seen_at - lag(r.seen_at) OVER (PARTITION BY r.user_id, r.plate ORDER BY r.seen_at)
                    > make_interval(secs => pol.same_pass_seconds)
               THEN 1 ELSE 0
             END AS is_new_pass
        FROM reads r
    )
    SELECT user_id, plate,
           sum(is_new_pass)::int AS passes,
           count(DISTINCT camera_id)::int AS cameras,
           max(seen_at) AS last_seen,
           (array_agg(camera_id ORDER BY seen_at DESC))[1] AS last_camera_id,
           (array_agg(camera_name ORDER BY seen_at DESC))[1] AS last_camera_name
      FROM marked
     GROUP BY user_id, plate
    HAVING sum(is_new_pass) >= min_pass
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.alerts a
       WHERE a.user_id = rec.user_id
         AND a.type = 'recurrent_vehicle'
         AND a.message LIKE '%' || rec.plate || '%'
         AND a.created_at > now() - make_interval(mins => pol.alert_cooldown_minutes)
    ) THEN
      skipped := skipped + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.alerts (camera_id, camera_name, type, severity, message, user_id, timestamp)
    VALUES (
      rec.last_camera_id, rec.last_camera_name, 'recurrent_vehicle'::alert_type,
      (CASE WHEN EXISTS (
        SELECT 1 FROM public.registered_plates p
         WHERE p.user_id = rec.user_id AND upper(trim(p.plate)) = rec.plate
           AND p.is_active AND p.list_type = 'blacklist'
      ) THEN 'critical' ELSE 'high' END)::rule_severity,
      format('Veículo recorrente %s: %s passagens em %s min (%s câmera(s))',
             rec.plate, rec.passes, win_min, rec.cameras),
      rec.user_id, rec.last_seen
    );
    emitted := emitted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'emitted', emitted, 'skipped', skipped,
    'window_minutes', win_min, 'min_passes', min_pass
  );
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_vehicle_recurrence(int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_vehicle_recurrence(int, int) TO service_role;