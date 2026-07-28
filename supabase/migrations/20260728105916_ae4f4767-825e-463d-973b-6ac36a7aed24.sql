-- ============================================================
-- Onda 180 — Reincidência de alarme persistida (espelho servidor
-- de src/lib/alarms/alarmRecurrence.ts)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.alarm_recurrence_episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  series_key text NOT NULL CHECK (char_length(btrim(series_key)) BETWEEN 1 AND 200),
  alert_id uuid REFERENCES public.event_alerts(id) ON DELETE SET NULL,
  severity public.event_alert_severity NOT NULL,
  opened_at timestamptz NOT NULL,
  closed_at timestamptz,
  -- Regra 3: episódio aberto NÃO tem duração (null), nunca zero.
  duration_ms bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT alarm_recurrence_duration_shape CHECK (
    (closed_at IS NULL AND duration_ms IS NULL)
    OR (closed_at IS NOT NULL AND duration_ms IS NOT NULL AND duration_ms >= 0)
  )
);

-- No máximo um episódio aberto por série (espelha `openIndex`).
CREATE UNIQUE INDEX IF NOT EXISTS uq_alarm_recurrence_open_series
  ON public.alarm_recurrence_episodes (organization_id, series_key)
  WHERE closed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_alarm_recurrence_series_time
  ON public.alarm_recurrence_episodes (organization_id, series_key, opened_at DESC);

REVOKE ALL ON public.alarm_recurrence_episodes FROM anon;
REVOKE ALL ON public.alarm_recurrence_episodes FROM authenticated;
GRANT SELECT ON public.alarm_recurrence_episodes TO authenticated;
GRANT ALL ON public.alarm_recurrence_episodes TO service_role;

ALTER TABLE public.alarm_recurrence_episodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS alarm_recurrence_select ON public.alarm_recurrence_episodes;
CREATE POLICY alarm_recurrence_select ON public.alarm_recurrence_episodes
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));

-- Escrita só pela RPC (definer). Apagar/reescrever destruiria a prova
-- de reincidência; só o fechamento do episódio aberto é permitido.
CREATE OR REPLACE FUNCTION public.block_alarm_recurrence_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'alarm_recurrence_episodes é imutável (append-only)';
  END IF;
  IF OLD.closed_at IS NOT NULL THEN
    RAISE EXCEPTION 'episódio já encerrado não pode ser alterado';
  END IF;
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.series_key IS DISTINCT FROM OLD.series_key
     OR NEW.opened_at IS DISTINCT FROM OLD.opened_at
     OR NEW.severity IS DISTINCT FROM OLD.severity THEN
    RAISE EXCEPTION 'somente o encerramento do episódio pode ser gravado';
  END IF;
  IF NEW.closed_at IS NULL THEN
    RAISE EXCEPTION 'atualização precisa encerrar o episódio';
  END IF;
  IF NEW.closed_at < OLD.opened_at THEN
    RAISE EXCEPTION 'encerramento antes da abertura' USING ERRCODE = 'check_violation';
  END IF;
  NEW.duration_ms := (EXTRACT(EPOCH FROM (NEW.closed_at - OLD.opened_at)) * 1000)::bigint;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alarm_recurrence_guard ON public.alarm_recurrence_episodes;
CREATE TRIGGER trg_alarm_recurrence_guard
  BEFORE UPDATE OR DELETE ON public.alarm_recurrence_episodes
  FOR EACH ROW EXECUTE FUNCTION public.block_alarm_recurrence_mutation();

-- ------------------------------------------------------------
-- Registro de abertura
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_alarm_episode_open(
  p_organization_id uuid,
  p_series_key text,
  p_severity text,
  p_alert_id uuid DEFAULT NULL,
  p_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_id uuid;
  v_last timestamptz;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'autenticação obrigatória' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT public.is_org_member(p_organization_id, v_actor) THEN
    RAISE EXCEPTION 'sem acesso a esta organização' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Já aberto: ignora (espelha `already_open`), devolvendo o episódio vigente.
  SELECT id INTO v_id FROM public.alarm_recurrence_episodes
   WHERE organization_id = p_organization_id AND series_key = p_series_key
     AND closed_at IS NULL
   LIMIT 1;
  IF FOUND THEN RETURN v_id; END IF;

  -- Regra 5: carimbo retrocedido não reescreve o passado.
  SELECT max(GREATEST(opened_at, coalesce(closed_at, opened_at))) INTO v_last
    FROM public.alarm_recurrence_episodes
   WHERE organization_id = p_organization_id AND series_key = p_series_key;
  IF v_last IS NOT NULL AND p_at < v_last THEN
    RAISE EXCEPTION 'carimbo anterior ao último aceito' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.alarm_recurrence_episodes
    (organization_id, series_key, alert_id, severity, opened_at)
  VALUES
    (p_organization_id, btrim(p_series_key), p_alert_id,
     p_severity::public.event_alert_severity, p_at)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_alarm_episode_open(uuid, text, text, uuid, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_alarm_episode_open(uuid, text, text, uuid, timestamptz) TO authenticated;

-- ------------------------------------------------------------
-- Registro de encerramento
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_alarm_episode_close(
  p_organization_id uuid,
  p_series_key text,
  p_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'autenticação obrigatória' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT public.is_org_member(p_organization_id, v_actor) THEN
    RAISE EXCEPTION 'sem acesso a esta organização' USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.alarm_recurrence_episodes
     SET closed_at = p_at
   WHERE organization_id = p_organization_id
     AND series_key = p_series_key
     AND closed_at IS NULL
  RETURNING id INTO v_id;

  RETURN v_id; -- NULL quando não havia episódio aberto (espelha `not_open`)
END;
$$;

REVOKE ALL ON FUNCTION public.record_alarm_episode_close(uuid, text, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_alarm_episode_close(uuid, text, timestamptz) TO authenticated;

-- ------------------------------------------------------------
-- Avaliação — espelho de assessRecurrence()
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assess_alarm_recurrence(
  p_organization_id uuid,
  p_series_key text,
  p_now timestamptz DEFAULT now(),
  p_window_ms bigint DEFAULT 3600000,
  p_recurrent_threshold int DEFAULT 3,
  p_chronic_threshold int DEFAULT 6,
  p_chatter_max_ms bigint DEFAULT 30000,
  p_chatter_threshold int DEFAULT 3
)
RETURNS TABLE (
  klass text,
  mode text,
  episodes_in_window int,
  chatter_in_window int,
  flapping boolean,
  peak_severity text,
  is_open boolean,
  collapsed_count int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_window bigint := GREATEST(coalesce(p_window_ms, 3600000), 1);
  v_rec int := GREATEST(coalesce(p_recurrent_threshold, 3), 2);
  v_chr int;
  v_chatter_ms bigint := GREATEST(coalesce(p_chatter_max_ms, 30000), 0);
  v_chatter_n int := GREATEST(coalesce(p_chatter_threshold, 3), 1);
  v_from timestamptz;
  v_eps int; v_chat int; v_open boolean; v_peak int; v_peak_txt text;
  v_class text; v_mode text;
BEGIN
  IF v_actor IS NULL OR NOT public.is_org_member(p_organization_id, v_actor) THEN
    RAISE EXCEPTION 'sem acesso a esta organização' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Regra 6: crônico nunca é mais fácil que reincidente.
  v_chr := GREATEST(coalesce(p_chronic_threshold, 6), v_rec + 1);
  v_from := p_now - make_interval(secs => v_window / 1000.0);

  SELECT
    count(*)::int,
    count(*) FILTER (
      WHERE e.closed_at IS NOT NULL AND e.duration_ms < v_chatter_ms
    )::int,
    bool_or(e.closed_at IS NULL),
    max(CASE e.severity WHEN 'low' THEN 0 WHEN 'medium' THEN 1
                        WHEN 'high' THEN 2 WHEN 'critical' THEN 3 END)
  INTO v_eps, v_chat, v_open, v_peak
  FROM public.alarm_recurrence_episodes e
  WHERE e.organization_id = p_organization_id
    AND e.series_key = p_series_key
    -- Toca a janela: aberto conta sempre (regra 3).
    AND coalesce(e.closed_at, p_now) >= v_from;

  v_eps := coalesce(v_eps, 0);
  v_chat := coalesce(v_chat, 0);
  v_open := coalesce(v_open, false);
  v_peak_txt := CASE v_peak WHEN 0 THEN 'low' WHEN 1 THEN 'medium'
                            WHEN 2 THEN 'high' WHEN 3 THEN 'critical' ELSE NULL END;

  v_class := CASE
    WHEN v_eps >= v_chr THEN 'chronic'
    WHEN v_eps >= v_rec THEN 'recurrent'
    WHEN v_chat >= v_chatter_n THEN 'recurrent'
    ELSE 'isolated'
  END;

  -- Regra 2: crítico nunca é resumido.
  v_mode := CASE
    WHEN v_class = 'chronic' THEN 'escalate'
    WHEN v_class = 'recurrent' AND v_peak_txt IS DISTINCT FROM 'critical' THEN 'summarize'
    ELSE 'notify'
  END;

  RETURN QUERY SELECT
    v_class, v_mode, v_eps, v_chat,
    (v_chat >= v_chatter_n),
    v_peak_txt,
    v_open,
    CASE WHEN v_mode = 'summarize' THEN GREATEST(v_eps - 1, 0) ELSE 0 END;
END;
$$;

REVOKE ALL ON FUNCTION public.assess_alarm_recurrence(uuid, text, timestamptz, bigint, int, int, bigint, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.assess_alarm_recurrence(uuid, text, timestamptz, bigint, int, int, bigint, int) TO authenticated;