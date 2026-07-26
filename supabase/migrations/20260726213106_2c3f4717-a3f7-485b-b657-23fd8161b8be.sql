-- Onda 132 — Retenção justa dos avisos da rede colaborativa.

CREATE TABLE IF NOT EXISTS public.collab_notification_purge_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_at timestamptz NOT NULL DEFAULT now(),
  base_days integer NOT NULL,
  hard_ceiling_days integer NOT NULL,
  deleted_notifications integer NOT NULL DEFAULT 0,
  deleted_silences integer NOT NULL DEFAULT 0,
  truncated boolean NOT NULL DEFAULT false,
  duration_ms integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS collab_notification_purge_runs_executed_idx
  ON public.collab_notification_purge_runs (executed_at DESC);

REVOKE ALL ON public.collab_notification_purge_runs FROM anon, authenticated, PUBLIC;
GRANT SELECT ON public.collab_notification_purge_runs TO authenticated;
GRANT ALL ON public.collab_notification_purge_runs TO service_role;

ALTER TABLE public.collab_notification_purge_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS collab_purge_runs_select_admin ON public.collab_notification_purge_runs;
CREATE POLICY collab_purge_runs_select_admin
  ON public.collab_notification_purge_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Política de retenção (espelhada em src/lib/collab/collabRetention.ts).
CREATE OR REPLACE FUNCTION public.collab_retention_policy()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'baseDays', 90,
    'actionableGraceDays', 365,
    'criticalGraceDays', 365,
    'attentionGraceDays', 180,
    'hardCeilingDays', 365,
    'expiredSilenceGraceDays', 30,
    'maxDeletePerRun', 5000
  )
$$;

-- Idade mínima, em dias, para apagar um aviso.
CREATE OR REPLACE FUNCTION public.collab_effective_retention_days(
  p_kind text,
  p_has_read boolean
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v jsonb := public.collab_retention_policy();
  v_base int := (v ->> 'baseDays')::int;
  v_ceiling int := (v ->> 'hardCeilingDays')::int;
  v_grace int;
BEGIN
  IF p_has_read THEN
    RETURN v_base;
  END IF;

  IF p_kind = 'invite_received' THEN
    -- Único tipo acionável: espera decisão humana.
    v_grace := (v ->> 'actionableGraceDays')::int;
  ELSIF public.collab_notification_severity(p_kind) = 'critical' THEN
    v_grace := (v ->> 'criticalGraceDays')::int;
  ELSIF public.collab_notification_severity(p_kind) = 'attention' THEN
    v_grace := (v ->> 'attentionGraceDays')::int;
  ELSE
    v_grace := v_base;
  END IF;

  RETURN LEAST(GREATEST(v_base, v_grace), v_ceiling);
END;
$$;

DROP FUNCTION IF EXISTS public.collab_purge_notifications(timestamptz);

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
  -- Elegíveis: idade maior que a carência efetiva do próprio aviso.
  CREATE TEMP TABLE IF NOT EXISTS _collab_purge_batch (id uuid PRIMARY KEY) ON COMMIT DROP;
  TRUNCATE _collab_purge_batch;

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

  -- Silêncios vencidos há mais que a folga não têm mais função nenhuma.
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
REVOKE ALL ON FUNCTION public.collab_retention_policy() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.collab_retention_policy() TO authenticated;
REVOKE ALL ON FUNCTION public.collab_effective_retention_days(text, boolean) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.collab_effective_retention_days(text, boolean) TO authenticated;