-- Onda 155 — eventos nativos ONVIF (PullPoint).
-- Espelha o vocabulário fechado de src/lib/devices/pullPointLease.ts.

CREATE TABLE public.onvif_event_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  camera_id uuid NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  subscription_ref text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','backoff','retired')),
  lease_started_at timestamptz,
  termination_at timestamptz,
  lease_duration_ms integer NOT NULL DEFAULT 300000
    CHECK (lease_duration_ms BETWEEN 60000 AND 600000),
  consecutive_failures integer NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  last_failure_kind text NOT NULL DEFAULT 'none'
    CHECK (last_failure_kind IN ('none','transport','device_fault','auth','unsupported')),
  last_decision text
    CHECK (last_decision IN ('create','pull','renew','recreate','wait','retire')),
  last_decision_reason text,
  last_attempt_at timestamptz,
  last_event_at timestamptz,
  events_received bigint NOT NULL DEFAULT 0 CHECK (events_received >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT onvif_event_subscriptions_unique_camera UNIQUE (camera_id)
);

CREATE INDEX idx_onvif_subs_due
  ON public.onvif_event_subscriptions (status, termination_at)
  WHERE status <> 'retired';
CREATE INDEX idx_onvif_subs_user ON public.onvif_event_subscriptions (user_id);

GRANT SELECT ON public.onvif_event_subscriptions TO authenticated;
GRANT ALL ON public.onvif_event_subscriptions TO service_role;
REVOKE ALL ON public.onvif_event_subscriptions FROM anon;

ALTER TABLE public.onvif_event_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onvif_subs_owner_select" ON public.onvif_event_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "onvif_subs_service_all" ON public.onvif_event_subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_onvif_subs_updated_at
  BEFORE UPDATE ON public.onvif_event_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------

CREATE TABLE public.onvif_event_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  camera_id uuid NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.onvif_event_subscriptions(id) ON DELETE SET NULL,
  topic text NOT NULL,
  source_token text,
  -- instante declarado pelo EQUIPAMENTO; base da chave de duplicidade
  device_utc_time text NOT NULL,
  dedup_key text NOT NULL,
  property_operation text
    CHECK (property_operation IN ('Initialized','Changed','Deleted')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT onvif_event_deliveries_dedup UNIQUE (dedup_key)
);

CREATE INDEX idx_onvif_events_camera_time
  ON public.onvif_event_deliveries (camera_id, received_at DESC);
CREATE INDEX idx_onvif_events_user ON public.onvif_event_deliveries (user_id);

GRANT SELECT ON public.onvif_event_deliveries TO authenticated;
GRANT ALL ON public.onvif_event_deliveries TO service_role;
REVOKE ALL ON public.onvif_event_deliveries FROM anon;

ALTER TABLE public.onvif_event_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onvif_events_owner_select" ON public.onvif_event_deliveries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "onvif_events_service_all" ON public.onvif_event_deliveries
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Trilha de fatos relatados pelo equipamento: imutável, como io_actuation_log.
CREATE OR REPLACE FUNCTION public.block_onvif_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'onvif_event_deliveries é append-only (tentativa de %)', TG_OP;
END;
$$;

REVOKE ALL ON FUNCTION public.block_onvif_event_mutation() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_onvif_events_immutable
  BEFORE UPDATE OR DELETE ON public.onvif_event_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.block_onvif_event_mutation();

-- ---------------------------------------------------------------------------
-- Ingestão idempotente: sob concorrência, dois pulls podem trazer o mesmo fato.
CREATE OR REPLACE FUNCTION public.record_onvif_event(
  p_user_id uuid,
  p_camera_id uuid,
  p_subscription_id uuid,
  p_topic text,
  p_source_token text,
  p_device_utc_time text,
  p_dedup_key text,
  p_property_operation text,
  p_data jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted boolean := false;
BEGIN
  INSERT INTO public.onvif_event_deliveries (
    user_id, camera_id, subscription_id, topic, source_token,
    device_utc_time, dedup_key, property_operation, data
  ) VALUES (
    p_user_id, p_camera_id, p_subscription_id, p_topic, p_source_token,
    p_device_utc_time, p_dedup_key, p_property_operation, COALESCE(p_data, '{}'::jsonb)
  )
  ON CONFLICT (dedup_key) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted THEN
    UPDATE public.onvif_event_subscriptions
       SET last_event_at = now(),
           events_received = events_received + 1
     WHERE id = p_subscription_id;
  END IF;

  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.record_onvif_event(uuid,uuid,uuid,text,text,text,text,text,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_onvif_event(uuid,uuid,uuid,text,text,text,text,text,jsonb)
  TO service_role;