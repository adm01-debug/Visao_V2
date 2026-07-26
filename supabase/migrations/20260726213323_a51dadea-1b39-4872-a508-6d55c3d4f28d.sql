CREATE OR REPLACE FUNCTION public.collab_purge_notifications(
  p_now timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb := public.collab_retention_policy();
  v_base int := (v ->> 'baseDays')::int;
  v_ceiling int := (v ->> 'hardCeilingDays')::int;
  v_limit int := (v ->> 'maxDeletePerRun')::int;
  v_silence_grace int := (v ->> 'expiredSilenceGraceDays')::int;
  v_started timestamptz := clock_timestamp();
  v_deleted int := 0;
  v_silences int := 0;
  v_eligible bigint := 0;
BEGIN
  DROP TABLE IF EXISTS _collab_purge_batch;
  CREATE TEMP TABLE _collab_purge_batch (id uuid PRIMARY KEY) ON COMMIT DROP;

  INSERT INTO _collab_purge_batch (id)
  SELECT n.id
    FROM public.collab_notifications n
   WHERE n.created_at < p_now - make_interval(
           days => public.collab_effective_retention_days(
             n.kind,
             EXISTS (SELECT 1 FROM public.collab_notification_reads r
                      WHERE r.notification_id = n.id)))
   ORDER BY n.created_at;

  SELECT count(*) INTO v_eligible FROM _collab_purge_batch;

  DELETE FROM public.collab_notifications n
   USING (SELECT id FROM _collab_purge_batch LIMIT v_limit) b
   WHERE n.id = b.id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  DELETE FROM public.collab_notification_silences s
   WHERE s.silenced_until < p_now - make_interval(days => v_silence_grace);
  GET DIAGNOSTICS v_silences = ROW_COUNT;

  INSERT INTO public.collab_notification_purge_runs (
    executed_at, base_days, hard_ceiling_days,
    deleted_notifications, deleted_silences, truncated, duration_ms
  ) VALUES (
    p_now, v_base, v_ceiling,
    v_deleted, v_silences, v_eligible > v_deleted,
    GREATEST(0, (EXTRACT(EPOCH FROM (clock_timestamp() - v_started)) * 1000)::int)
  );

  RETURN jsonb_build_object(
    'deletedNotifications', v_deleted,
    'deletedSilences', v_silences,
    'truncated', v_eligible > v_deleted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.collab_purge_notifications(timestamptz) FROM anon, authenticated, PUBLIC;

SELECT cron.unschedule('collab-purge-notifications')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'collab-purge-notifications');

SELECT cron.schedule(
  'collab-purge-notifications',
  '41 * * * *',
  $cron$SELECT public.collab_purge_notifications();$cron$
);