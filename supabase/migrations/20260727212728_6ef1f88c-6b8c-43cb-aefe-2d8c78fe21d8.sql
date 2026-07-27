-- =====================================================================
-- Onda 154 — I/O de alarme físico (etapas 1 e 2 do plano de paridade)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) camera_io_ports — cadastro das portas físicas do equipamento
-- ---------------------------------------------------------------------
CREATE TABLE public.camera_io_ports (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL,
  camera_id      uuid NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  direction      text NOT NULL CHECK (direction IN ('input','output')),
  -- Token do equipamento (ONVIF RelayOutput/DigitalInput). Estável por device.
  port_token     text NOT NULL,
  label          text NOT NULL DEFAULT '',
  -- Estado de repouso do contato. NA = normalmente aberto, NF = normalmente fechado.
  idle_state     text NOT NULL DEFAULT 'open' CHECK (idle_state IN ('open','closed')),
  -- Modo de operação da saída no equipamento.
  output_mode    text NOT NULL DEFAULT 'monostable'
                 CHECK (output_mode IN ('monostable','bistable')),
  -- Duração padrão do pulso, em ms. Teto duro de 60s aplicado aqui e em ioSafety.ts.
  pulse_ms       integer NOT NULL DEFAULT 2000
                 CHECK (pulse_ms BETWEEN 100 AND 60000),
  -- Intervalo mínimo entre acionamentos, em ms. Evita martelar relé.
  min_interval_ms integer NOT NULL DEFAULT 1000
                 CHECK (min_interval_ms BETWEEN 0 AND 600000),
  enabled        boolean NOT NULL DEFAULT true,
  -- Última leitura conhecida (entradas) ou último estado comandado (saídas).
  last_state     text CHECK (last_state IN ('active','inactive','unknown')),
  last_state_at  timestamptz,
  last_actuated_at timestamptz,
  metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  -- Um token é único por câmera: descoberta repetida atualiza, não duplica.
  CONSTRAINT camera_io_ports_unique_token UNIQUE (camera_id, port_token)
);

CREATE INDEX idx_camera_io_ports_camera ON public.camera_io_ports (camera_id, direction);
CREATE INDEX idx_camera_io_ports_user ON public.camera_io_ports (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.camera_io_ports TO authenticated;
GRANT ALL ON public.camera_io_ports TO service_role;
REVOKE ALL ON public.camera_io_ports FROM anon;

ALTER TABLE public.camera_io_ports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "io_ports_select_own" ON public.camera_io_ports
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "io_ports_insert_own" ON public.camera_io_ports
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "io_ports_update_own" ON public.camera_io_ports
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "io_ports_delete_own" ON public.camera_io_ports
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_camera_io_ports_updated_at
  BEFORE UPDATE ON public.camera_io_ports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 2) io_actuation_log — trilha IMUTÁVEL de acionamento
--    Prova de que alguém abriu o portão. Linha que pode ser editada
--    não é prova; por isso UPDATE/DELETE são bloqueados por gatilho.
-- ---------------------------------------------------------------------
CREATE TABLE public.io_actuation_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  camera_id     uuid NOT NULL,
  port_id       uuid,
  port_token    text NOT NULL,
  -- Quem mandou: humano na UI, motor de regras, evento do equipamento, cron.
  origin        text NOT NULL CHECK (origin IN ('human','rule','event','schedule','test')),
  origin_ref    uuid,
  actor_user_id uuid,
  command       text NOT NULL CHECK (command IN ('pulse','set_active','set_inactive')),
  requested_ms  integer,
  outcome       text NOT NULL CHECK (outcome IN ('accepted','rejected','failed','completed')),
  -- Motivo canônico da recusa/falha. Espelha ioSafety.ts e networkError.ts.
  reason_code   text,
  chosen_path   text,
  latency_ms    integer,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_io_actuation_log_camera ON public.io_actuation_log (camera_id, created_at DESC);
CREATE INDEX idx_io_actuation_log_user ON public.io_actuation_log (user_id, created_at DESC);
CREATE INDEX idx_io_actuation_log_port ON public.io_actuation_log (port_id, created_at DESC);

GRANT SELECT ON public.io_actuation_log TO authenticated;
GRANT ALL ON public.io_actuation_log TO service_role;
REVOKE ALL ON public.io_actuation_log FROM anon;

ALTER TABLE public.io_actuation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "io_log_select_own" ON public.io_actuation_log
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.block_io_actuation_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'io_actuation_log e imutavel: % nao permitido', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER trg_io_actuation_log_immutable
  BEFORE UPDATE OR DELETE ON public.io_actuation_log
  FOR EACH ROW EXECUTE FUNCTION public.block_io_actuation_log_mutation();

-- ---------------------------------------------------------------------
-- 3) Catálogo de capacidades — nova permissão fina cameras.control_io
--    Piso: manager. Operador recebe por concessão nominal com prazo.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.capability_catalog()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ARRAY[
    'cameras.view','cameras.manage','cameras.ptz.control','cameras.ptz.calibrate',
    'cameras.control_io',
    'recordings.view','recordings.export','recordings.delete',
    'alerts.view','alerts.acknowledge','alerts.dispatch',
    'maintenance.view','maintenance.acknowledge',
    'collab.view','collab.govern',
    'agents.view','agents.heal',
    'users.view','users.manage','users.grant_capability',
    'audit.view'
  ]::text[]
$$;

CREATE OR REPLACE FUNCTION public.role_baseline_capabilities(_role app_role)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  viewer_caps text[] := ARRAY['cameras.view','recordings.view','alerts.view'];
  operator_caps text[] := viewer_caps || ARRAY[
    'cameras.ptz.control','recordings.export','alerts.acknowledge',
    'maintenance.view','collab.view','agents.view'];
  manager_caps text[] := operator_caps || ARRAY[
    'cameras.manage','cameras.ptz.calibrate','cameras.control_io','alerts.dispatch',
    'maintenance.acknowledge','collab.govern','users.view','audit.view'];
BEGIN
  RETURN CASE _role
    WHEN 'admin' THEN public.capability_catalog()
    WHEN 'manager' THEN manager_caps
    WHEN 'operator' THEN operator_caps
    ELSE viewer_caps
  END;
END;
$$;