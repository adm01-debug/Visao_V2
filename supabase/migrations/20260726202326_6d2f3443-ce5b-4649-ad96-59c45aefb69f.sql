-- =====================================================================
-- Onda 126 — Conectores para centrais de monitoramento (SIA DC-09 / Contact ID)
-- Espelho SQL de src/lib/integrations/monitoringCenter.ts (gate: check-monitoring-centers.mjs)
-- =====================================================================

CREATE TABLE public.monitoring_center_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  provider        text NOT NULL CHECK (provider IN ('sigma','moni','commbox','sia_dc09')),
  label           text NOT NULL,
  account_code    text NOT NULL CHECK (account_code ~ '^[0-9A-F]{4,6}$'),
  partition_code  text NOT NULL DEFAULT '01' CHECK (partition_code ~ '^[0-9]{2}$'),
  receiver_number text NOT NULL DEFAULT '1'  CHECK (receiver_number ~ '^[0-9]{1,6}$'),
  line_prefix     text NOT NULL DEFAULT '1'  CHECK (line_prefix ~ '^[0-9]{1,6}$'),
  endpoint_url    text NOT NULL CHECK (endpoint_url ~ '^https://'),
  event_kinds     text[] NOT NULL DEFAULT '{}',
  enabled         boolean NOT NULL DEFAULT true,
  last_heartbeat_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT monitoring_center_accounts_unique UNIQUE (user_id, provider, account_code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monitoring_center_accounts TO authenticated;
GRANT ALL ON public.monitoring_center_accounts TO service_role;
REVOKE ALL ON public.monitoring_center_accounts FROM anon, PUBLIC;
ALTER TABLE public.monitoring_center_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY monitoring_center_accounts_user_isolation
  ON public.monitoring_center_accounts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_monitoring_center_accounts_updated_at
  BEFORE UPDATE ON public.monitoring_center_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
CREATE TABLE public.monitoring_center_dispatches (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL,
  account_id     uuid NOT NULL REFERENCES public.monitoring_center_accounts(id) ON DELETE CASCADE,
  camera_id      uuid,
  event_kind     text NOT NULL,
  contact_code   text NOT NULL CHECK (contact_code ~ '^[0-9]{3}$'),
  qualifier      char(1) NOT NULL CHECK (qualifier IN ('E','R')),
  zone_code      text NOT NULL DEFAULT '000' CHECK (zone_code ~ '^[0-9]{3}$'),
  priority       smallint NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 9),
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key     text NOT NULL,
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','claimed','delivered','failed','expired')),
  attempts       int NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_expires_at timestamptz,
  claimed_by     text,
  last_error     text,
  delivered_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT monitoring_center_dispatches_lease_sane
    CHECK (status <> 'claimed' OR (lease_expires_at IS NOT NULL AND claimed_by IS NOT NULL)),
  CONSTRAINT monitoring_center_dispatches_delivered_sane
    CHECK ((status = 'delivered') = (delivered_at IS NOT NULL))
);

GRANT SELECT ON public.monitoring_center_dispatches TO authenticated;
GRANT ALL ON public.monitoring_center_dispatches TO service_role;
REVOKE ALL ON public.monitoring_center_dispatches FROM anon, PUBLIC;
ALTER TABLE public.monitoring_center_dispatches ENABLE ROW LEVEL SECURITY;

-- Leitura apenas: a escrita passa obrigatoriamente pelas rotinas SECURITY DEFINER,
-- para que nenhuma UI consiga forjar um código Contact ID enviado à central.
CREATE POLICY monitoring_center_dispatches_user_isolation
  ON public.monitoring_center_dispatches FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE UNIQUE INDEX uq_monitoring_center_dispatches_dedupe
  ON public.monitoring_center_dispatches (dedupe_key);
CREATE INDEX idx_monitoring_center_dispatches_queue
  ON public.monitoring_center_dispatches (priority, next_attempt_at)
  WHERE status = 'pending';
CREATE INDEX idx_monitoring_center_dispatches_lease
  ON public.monitoring_center_dispatches (lease_expires_at) WHERE status = 'claimed';
CREATE INDEX idx_monitoring_center_dispatches_user_recent
  ON public.monitoring_center_dispatches (user_id, created_at DESC);

CREATE TRIGGER update_monitoring_center_dispatches_updated_at
  BEFORE UPDATE ON public.monitoring_center_dispatches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- Política (espelho de MONITORING_CENTER_POLICY)
CREATE OR REPLACE FUNCTION public.monitoring_center_policy()
RETURNS TABLE (
  max_attempts int, base_backoff_seconds int, max_backoff_seconds int,
  lease_seconds int, dedupe_window_seconds int, deadline_seconds int,
  heartbeat_seconds int
)
LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 5, 15, 600, 60, 120, 3600, 900
$$;

-- Mapa evento -> Contact ID (espelho de CONTACT_ID_MAP)
CREATE OR REPLACE FUNCTION public.contact_id_for_event(_kind text)
RETURNS TABLE (code text, qualifier char(1), priority smallint)
LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.code, m.qualifier, m.priority
    FROM (VALUES
      ('panic','120','E',1),('duress','121','E',1),('fire','110','E',1),
      ('intrusion','130','E',2),('perimeter','131','E',2),('tamper','137','E',2),
      ('blacklist_plate','150','E',2),('loitering','150','E',3),
      ('camera_offline','380','E',4),('camera_online','380','R',5),
      ('agent_offline','350','E',4),('agent_online','350','R',5),
      ('storage_failure','300','E',4),
      ('arm','401','R',6),('disarm','401','E',6),
      ('heartbeat','602','E',9)
    ) AS m(kind, code, qualifier, priority)
   WHERE m.kind = _kind
$$;

-- Recuo exponencial (espelho de backoffSeconds)
CREATE OR REPLACE FUNCTION public.monitoring_center_backoff_seconds(_attempts int)
RETURNS int
LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT LEAST(
    (SELECT base_backoff_seconds FROM public.monitoring_center_policy())
      * (2 ^ (GREATEST(COALESCE(_attempts, 1), 1) - 1))::bigint,
    (SELECT max_backoff_seconds FROM public.monitoring_center_policy())
  )::int
$$;

-- Enfileiramento com deduplicação por janela
CREATE OR REPLACE FUNCTION public.enqueue_monitoring_center_event(
  _account_id uuid,
  _event_kind text,
  _zone_code  text DEFAULT '000',
  _camera_id  uuid DEFAULT NULL,
  _payload    jsonb DEFAULT '{}'::jsonb,
  _at         timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  acc  record;
  map  record;
  pol  record;
  zone text;
  key  text;
  did  uuid;
BEGIN
  SELECT * INTO acc FROM public.monitoring_center_accounts WHERE id = _account_id;
  IF acc IS NULL THEN
    RETURN jsonb_build_object('queued', false, 'reason', 'unknown_account');
  END IF;
  IF NOT acc.enabled THEN
    RETURN jsonb_build_object('queued', false, 'reason', 'account_disabled');
  END IF;

  SELECT * INTO map FROM public.contact_id_for_event(_event_kind);
  IF map IS NULL THEN
    RETURN jsonb_build_object('queued', false, 'reason', 'unmapped_event');
  END IF;

  IF cardinality(acc.event_kinds) > 0 AND NOT (_event_kind = ANY (acc.event_kinds)) THEN
    RETURN jsonb_build_object('queued', false, 'reason', 'event_not_subscribed');
  END IF;

  SELECT * INTO pol FROM public.monitoring_center_policy();
  zone := lpad(regexp_replace(COALESCE(_zone_code, '000'), '\D', '', 'g'), 3, '0');
  zone := right(zone, 3);

  key := acc.id::text || '|' || map.code || '|' || map.qualifier || '|' || zone || '|' ||
         (floor(extract(epoch FROM _at) / pol.dedupe_window_seconds))::bigint::text;

  INSERT INTO public.monitoring_center_dispatches
    (user_id, account_id, camera_id, event_kind, contact_code, qualifier, zone_code,
     priority, payload, dedupe_key, next_attempt_at, created_at)
  VALUES
    (acc.user_id, acc.id, _camera_id, _event_kind, map.code, map.qualifier, zone,
     map.priority, COALESCE(_payload, '{}'::jsonb), key, _at, _at)
  ON CONFLICT (dedupe_key) DO NOTHING
  RETURNING id INTO did;

  IF did IS NULL THEN
    RETURN jsonb_build_object('queued', false, 'reason', 'deduplicated', 'dedupe_key', key);
  END IF;

  RETURN jsonb_build_object(
    'queued', true, 'dispatch_id', did, 'code', map.code,
    'qualifier', map.qualifier, 'zone_code', zone, 'priority', map.priority
  );
END $$;

-- Reserva de lote pelo worker (lease)
CREATE OR REPLACE FUNCTION public.claim_monitoring_center_dispatches(
  _worker text,
  _limit  int DEFAULT 20
)
RETURNS SETOF public.monitoring_center_dispatches
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pol record;
BEGIN
  SELECT * INTO pol FROM public.monitoring_center_policy();
  RETURN QUERY
  WITH picked AS (
    SELECT d.id FROM public.monitoring_center_dispatches d
     WHERE d.status = 'pending' AND d.next_attempt_at <= now()
     ORDER BY d.priority, d.next_attempt_at
     LIMIT GREATEST(COALESCE(_limit, 20), 1)
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.monitoring_center_dispatches d
     SET status = 'claimed',
         claimed_by = _worker,
         lease_expires_at = now() + make_interval(secs => pol.lease_seconds)
    FROM picked
   WHERE d.id = picked.id
  RETURNING d.*;
END $$;

-- Conclusão de tentativa (espelho de settleDispatch)
CREATE OR REPLACE FUNCTION public.settle_monitoring_center_dispatch(
  _dispatch_id uuid,
  _ok          boolean,
  _error       text DEFAULT NULL,
  _at          timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d   record;
  pol record;
  att int;
  age numeric;
BEGIN
  SELECT * INTO d FROM public.monitoring_center_dispatches
   WHERE id = _dispatch_id FOR UPDATE;
  IF d IS NULL THEN
    RETURN jsonb_build_object('status', NULL, 'reason', 'unknown_dispatch');
  END IF;
  IF d.status IN ('delivered','failed','expired') THEN
    RETURN jsonb_build_object('status', d.status, 'attempts', d.attempts, 'reason', 'terminal');
  END IF;

  SELECT * INTO pol FROM public.monitoring_center_policy();
  att := d.attempts + 1;

  IF _ok THEN
    UPDATE public.monitoring_center_dispatches
       SET status='delivered', attempts=att, delivered_at=_at,
           lease_expires_at=NULL, claimed_by=NULL, last_error=NULL
     WHERE id = d.id;
    RETURN jsonb_build_object('status','delivered','attempts',att,'reason','delivered');
  END IF;

  age := extract(epoch FROM (_at - d.created_at));
  -- Prazo final vence tentativas restantes: alarme velho não deve virar viatura.
  IF age >= pol.deadline_seconds THEN
    UPDATE public.monitoring_center_dispatches
       SET status='expired', attempts=att, lease_expires_at=NULL, claimed_by=NULL,
           last_error=_error
     WHERE id = d.id;
    RETURN jsonb_build_object('status','expired','attempts',att,'reason','deadline_exceeded');
  END IF;

  IF att >= pol.max_attempts THEN
    UPDATE public.monitoring_center_dispatches
       SET status='failed', attempts=att, lease_expires_at=NULL, claimed_by=NULL,
           last_error=_error
     WHERE id = d.id;
    RETURN jsonb_build_object('status','failed','attempts',att,'reason','attempts_exhausted');
  END IF;

  UPDATE public.monitoring_center_dispatches
     SET status='pending', attempts=att, claimed_by=NULL, lease_expires_at=NULL,
         last_error=_error,
         next_attempt_at=_at + make_interval(secs => public.monitoring_center_backoff_seconds(att))
   WHERE id = d.id;

  RETURN jsonb_build_object(
    'status','pending','attempts',att,'reason','retry',
    'next_attempt_in_seconds', public.monitoring_center_backoff_seconds(att)
  );
END $$;

-- Liberação de reservas vencidas (worker morreu no meio do envio)
CREATE OR REPLACE FUNCTION public.reap_monitoring_center_leases()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  released int := 0;
BEGIN
  PERFORM set_config('statement_timeout', '15s', true);
  WITH stale AS (
    UPDATE public.monitoring_center_dispatches
       SET status='pending', claimed_by=NULL, lease_expires_at=NULL,
           last_error=COALESCE(last_error, 'lease_expired'),
           next_attempt_at=now()
     WHERE status='claimed' AND lease_expires_at < now()
    RETURNING 1
  )
  SELECT count(*)::int INTO released FROM stale;
  RETURN jsonb_build_object('released', released, 'at', now());
END $$;

REVOKE ALL ON FUNCTION public.monitoring_center_policy() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.contact_id_for_event(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.monitoring_center_backoff_seconds(int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_monitoring_center_event(uuid, text, text, uuid, jsonb, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_monitoring_center_dispatches(text, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_monitoring_center_dispatch(uuid, boolean, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reap_monitoring_center_leases() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.monitoring_center_policy() TO service_role;
GRANT EXECUTE ON FUNCTION public.contact_id_for_event(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.monitoring_center_backoff_seconds(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_monitoring_center_event(uuid, text, text, uuid, jsonb, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_monitoring_center_dispatches(text, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_monitoring_center_dispatch(uuid, boolean, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.reap_monitoring_center_leases() TO service_role;