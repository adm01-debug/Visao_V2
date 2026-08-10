-- ═══════════════════════════════════════════════════════════════════════════
-- Onda 192 — Fan-in de silêncio de dispositivo no barramento de manutenção.
--
-- Espelho fiel de src/lib/devices/deviceSilence.ts. A ordem dos ramos é parte
-- da regra: silêncio intencional primeiro, relógio depois, recusa antes de
-- ausência, "nunca visto" antes de aritmética de silêncio.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.device_silence_thresholds()
RETURNS TABLE (
  heartbeat_minutes       int,
  warn_factor             int,
  critical_factor         int,
  rotation_grace_minutes  int,
  denial_window_minutes   int,
  clock_tolerance_minutes int
)
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$ SELECT 15, 3, 8, 10, 60, 2 $$;

COMMENT ON FUNCTION public.device_silence_thresholds() IS
  'Onda 192: constantes do diagnóstico de presença. Espelho de deviceSilence.ts.';

-- Classificação pura, por dispositivo. SECURITY INVOKER de propósito: quem
-- chama vê apenas o que a RLS lhe permite ver.
CREATE OR REPLACE FUNCTION public.classify_device_silence(p_now timestamptz DEFAULT now())
RETURNS TABLE (
  registration_id uuid,
  device_code     text,
  label           text,
  user_id         uuid,
  state           text,
  severity        text,
  silence_minutes numeric,
  reason          text
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
WITH t AS (SELECT * FROM public.device_silence_thresholds()),
last_denial AS (
  SELECT a.registration_id, max(a.created_at) AS denied_at
    FROM public.device_registration_audit a
   WHERE a.event = 'auth_denied' AND a.registration_id IS NOT NULL
   GROUP BY a.registration_id
),
snap AS (
  SELECT d.id, d.device_code, d.label, d.user_id, d.status, d.last_seen_at,
         d.expires_at, d.rotated_at, d.created_at, ld.denied_at,
         t.heartbeat_minutes, t.warn_factor, t.critical_factor,
         t.rotation_grace_minutes, t.denial_window_minutes, t.clock_tolerance_minutes,
         GREATEST(0, EXTRACT(EPOCH FROM (p_now - d.last_seen_at)) / 60.0) AS silence_min
    FROM public.device_registrations d
    CROSS JOIN t
    LEFT JOIN last_denial ld ON ld.registration_id = d.id
),
judged AS (
  SELECT s.*,
    CASE
      -- (1) silêncio que nós mesmos causamos
      WHEN s.status = 'revoked' THEN 'expected_silence'
      WHEN s.expires_at IS NOT NULL AND s.expires_at <= p_now AND s.last_seen_at IS NOT NULL
        THEN 'expected_silence'
      -- (5) relógio antes de qualquer aritmética
      WHEN s.last_seen_at IS NOT NULL
       AND s.last_seen_at > p_now + make_interval(mins => s.clock_tolerance_minutes)
        THEN 'clock_anomaly'
      -- (3) recusa recente vence silêncio
      WHEN s.denied_at IS NOT NULL
       AND s.denied_at <= p_now + make_interval(mins => s.clock_tolerance_minutes)
       AND EXTRACT(EPOCH FROM (p_now - s.denied_at)) / 60.0 <= s.denial_window_minutes
       AND (s.last_seen_at IS NULL OR s.denied_at > s.last_seen_at)
        THEN 'rejected_presence'
      -- (2) nunca visto ≠ sumido
      WHEN s.last_seen_at IS NULL AND (s.expires_at IS NULL OR s.expires_at > p_now)
        THEN 'awaiting_first_contact'
      WHEN s.last_seen_at IS NULL
        THEN 'enrollment_lapsed'
      -- (4) rotação compra carência, e só se for posterior à última presença
      WHEN s.rotated_at IS NOT NULL
       AND s.rotated_at >= s.last_seen_at
       AND EXTRACT(EPOCH FROM (p_now - s.rotated_at)) / 60.0
           <= s.heartbeat_minutes + s.rotation_grace_minutes
        THEN 'rotation_grace'
      WHEN s.silence_min >= s.critical_factor * s.heartbeat_minutes THEN 'silent_critical'
      WHEN s.silence_min >= s.warn_factor * s.heartbeat_minutes    THEN 'silent_warn'
      ELSE 'ok'
    END AS state
  FROM snap s
)
SELECT
  j.id,
  j.device_code,
  j.label,
  j.user_id,
  j.state,
  CASE j.state
    WHEN 'rejected_presence' THEN 'critical'
    WHEN 'silent_critical'   THEN 'critical'
    WHEN 'silent_warn'       THEN 'warning'
    WHEN 'clock_anomaly'     THEN 'warning'
    WHEN 'enrollment_lapsed' THEN 'warning'
    ELSE NULL
  END AS severity,
  CASE
    WHEN j.state IN ('expected_silence', 'clock_anomaly', 'enrollment_lapsed', 'awaiting_first_contact')
      THEN NULL
    WHEN j.last_seen_at IS NULL THEN NULL
    ELSE round(j.silence_min)
  END AS silence_minutes,
  CASE j.state
    WHEN 'expected_silence' THEN
      CASE WHEN j.status = 'revoked'
        THEN 'registro revogado: ausência é o efeito pretendido'
        ELSE 'vínculo com prazo vencido: ausência é o efeito pretendido' END
    WHEN 'clock_anomaly' THEN
      format('%s: prova de vida %s min no futuro — relógio errado, não presença',
             j.label, round(EXTRACT(EPOCH FROM (j.last_seen_at - p_now)) / 60.0))
    WHEN 'rejected_presence' THEN
      format('%s: equipamento está se apresentando e sendo recusado — verifique o segredo de registro, não a rede', j.label)
    WHEN 'awaiting_first_contact' THEN
      format('%s: código emitido, aguardando a primeira conexão', j.label)
    WHEN 'enrollment_lapsed' THEN
      format('%s: código de registro expirou sem nunca ser usado — instalação não concluída', j.label)
    WHEN 'rotation_grace' THEN
      format('%s: segredo rotacionado há pouco, em carência', j.label)
    WHEN 'silent_critical' THEN
      format('%s: equipamento não se apresenta há %s min (cadência esperada de %s min)',
             j.label, round(j.silence_min), j.heartbeat_minutes)
    WHEN 'silent_warn' THEN
      format('%s: equipamento atrasado, sem apresentação há %s min (cadência esperada de %s min)',
             j.label, round(j.silence_min), j.heartbeat_minutes)
    ELSE format('%s: apresentando-se dentro da cadência', j.label)
  END AS reason
FROM judged j;
$$;

COMMENT ON FUNCTION public.classify_device_silence(timestamptz) IS
  'Onda 192: diagnóstico de presença por dispositivo. SECURITY INVOKER — respeita a RLS de quem chama.';

REVOKE ALL ON FUNCTION public.classify_device_silence(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.classify_device_silence(timestamptz) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.device_silence_thresholds() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.device_silence_thresholds() TO authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- Fan-in: leva o veredito acionável ao barramento de manutenção, com pausa
-- entre repetições e furo de pausa quando a gravidade piora.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.evaluate_device_silence_alerts(p_now timestamptz DEFAULT now())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cooldown_minutes constant int := 120;
  rec          record;
  v_key        text;
  v_emitted    int := 0;
  v_suppressed int := 0;
  v_escalated  int := 0;
  v_states     jsonb := '{}'::jsonb;
  v_prior      text;
BEGIN
  PERFORM set_config('statement_timeout', '20s', true);

  FOR rec IN
    SELECT * FROM public.classify_device_silence(p_now)
     ORDER BY device_code
  LOOP
    v_states := jsonb_set(
      v_states, ARRAY[rec.state],
      to_jsonb(COALESCE((v_states ->> rec.state)::int, 0) + 1), true);

    CONTINUE WHEN rec.severity IS NULL;

    v_key := 'device:' || rec.device_code;

    SELECT e.severity INTO v_prior
      FROM public.maintenance_alert_events e
     WHERE e.routine = v_key
       AND e.created_at > p_now - make_interval(mins => cooldown_minutes)
     ORDER BY e.created_at DESC
     LIMIT 1;

    -- Pausa entre repetições, mas piora sempre fura a pausa: um equipamento
    -- que passou de "atrasado" para "sumido" é notícia nova.
    IF v_prior IS NOT NULL AND NOT (v_prior = 'warning' AND rec.severity = 'critical') THEN
      v_suppressed := v_suppressed + 1;
      CONTINUE;
    END IF;

    IF v_prior = 'warning' AND rec.severity = 'critical' THEN
      v_escalated := v_escalated + 1;
    END IF;

    INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, observed_at)
    VALUES (
      v_key, rec.severity, rec.reason,
      jsonb_build_object(
        'source',           'device_silence',
        'registration_id',  rec.registration_id,
        'device_code',      rec.device_code,
        'state',            rec.state,
        'silence_minutes',  rec.silence_minutes,
        'cooldown_minutes', cooldown_minutes,
        'escalated_from',   v_prior
      ),
      p_now
    );
    v_emitted := v_emitted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'evaluated_at', p_now,
    'emitted',      v_emitted,
    'escalated',    v_escalated,
    'suppressed',   v_suppressed,
    'states',       v_states
  );
END;
$$;

COMMENT ON FUNCTION public.evaluate_device_silence_alerts(timestamptz) IS
  'Onda 192: fan-in de silêncio de dispositivo. Silêncio intencional nunca alerta; piora fura a pausa.';

REVOKE ALL ON FUNCTION public.evaluate_device_silence_alerts(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_device_silence_alerts(timestamptz) TO service_role;

SELECT cron.unschedule('evaluate-device-silence')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'evaluate-device-silence');

SELECT cron.schedule(
  'evaluate-device-silence',
  '*/10 * * * *',
  $cron$SELECT public.evaluate_device_silence_alerts();$cron$
);