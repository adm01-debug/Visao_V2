-- Onda 193 — fila de comandos remotos ao equipamento registrado.
CREATE TABLE public.device_remote_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  registration_id uuid NOT NULL REFERENCES public.device_registrations(id) ON DELETE CASCADE,
  command text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  decision_reason text NOT NULL DEFAULT 'admitted',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NOT NULL,
  expires_at timestamptz NOT NULL,
  delivered_at timestamptz,
  completed_at timestamptz,
  result jsonb,
  error_message text,
  requested_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT device_remote_commands_command_check CHECK (
    command IN ('osd.open','osd.apply','clock.sync','config.read','stream.restart','device.reboot')
  ),
  CONSTRAINT device_remote_commands_status_check CHECK (
    status IN ('queued','awaiting_presence','delivered','completed','failed','expired','cancelled')
  ),
  CONSTRAINT device_remote_commands_idempotency_shape CHECK (char_length(idempotency_key) BETWEEN 8 AND 128)
);

CREATE UNIQUE INDEX device_remote_commands_idem_uk
  ON public.device_remote_commands (registration_id, idempotency_key);

CREATE INDEX idx_device_remote_commands_open
  ON public.device_remote_commands (registration_id, status, expires_at DESC);

CREATE INDEX idx_device_remote_commands_user
  ON public.device_remote_commands (user_id, created_at DESC);

-- Um único comando exclusivo em voo por equipamento.
CREATE UNIQUE INDEX device_remote_commands_exclusive_uk
  ON public.device_remote_commands (registration_id)
  WHERE status IN ('queued','awaiting_presence','delivered')
    AND command IN ('device.reboot','stream.restart');

REVOKE ALL ON public.device_remote_commands FROM anon;
REVOKE ALL ON public.device_remote_commands FROM authenticated;
GRANT SELECT, INSERT ON public.device_remote_commands TO authenticated;
GRANT UPDATE (status, updated_at) ON public.device_remote_commands TO authenticated;
GRANT ALL ON public.device_remote_commands TO service_role;

ALTER TABLE public.device_remote_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "device_remote_commands_select_own"
  ON public.device_remote_commands FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "device_remote_commands_insert_own"
  ON public.device_remote_commands FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND requested_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.device_registrations r
      WHERE r.id = registration_id AND r.user_id = auth.uid()
    )
  );

-- Só cancelamento: qualquer outra transição é do servidor.
CREATE POLICY "device_remote_commands_cancel_own"
  ON public.device_remote_commands FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status IN ('queued','awaiting_presence'))
  WITH CHECK (user_id = auth.uid() AND status = 'cancelled');

-- Guarda de integridade: prazo declarado, estado terminal irreversível e
-- colunas de identidade imutáveis. Sem isto, a fila viraria um campo livre.
CREATE OR REPLACE FUNCTION public.guard_device_remote_command()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT r.user_id INTO v_owner
      FROM public.device_registrations r WHERE r.id = NEW.registration_id;
    IF v_owner IS NULL OR v_owner <> NEW.user_id THEN
      RAISE EXCEPTION 'comando não pertence ao dono do registro';
    END IF;
    IF NEW.expires_at <= NEW.created_at THEN
      RAISE EXCEPTION 'comando precisa de prazo futuro';
    END IF;
    IF NEW.expires_at > NEW.created_at + interval '30 minutes' THEN
      RAISE EXCEPTION 'prazo acima do teto de 30 minutos';
    END IF;
    IF NEW.status NOT IN ('queued','awaiting_presence') THEN
      RAISE EXCEPTION 'comando nasce na fila, nunca já resolvido';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status IN ('completed','failed','expired','cancelled')
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'comando encerrado não muda de estado';
  END IF;

  IF NEW.id <> OLD.id
     OR NEW.user_id <> OLD.user_id
     OR NEW.registration_id <> OLD.registration_id
     OR NEW.command <> OLD.command
     OR NEW.idempotency_key <> OLD.idempotency_key
     OR NEW.requested_by <> OLD.requested_by
     OR NEW.created_at <> OLD.created_at
     OR NEW.expires_at <> OLD.expires_at THEN
    RAISE EXCEPTION 'campos de identidade do comando são imutáveis';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_device_remote_command
  BEFORE INSERT OR UPDATE ON public.device_remote_commands
  FOR EACH ROW EXECUTE FUNCTION public.guard_device_remote_command();

-- Expiração: prazo vencido é fato do relógio, não decisão de ninguém.
CREATE OR REPLACE FUNCTION public.expire_device_remote_commands()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.device_remote_commands
     SET status = 'expired', updated_at = now()
   WHERE status IN ('queued','awaiting_presence','delivered')
     AND expires_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_device_remote_commands() FROM public;
REVOKE ALL ON FUNCTION public.expire_device_remote_commands() FROM anon;
REVOKE ALL ON FUNCTION public.expire_device_remote_commands() FROM authenticated;

SELECT cron.schedule(
  'expire-device-remote-commands',
  '*/2 * * * *',
  $$SELECT public.expire_device_remote_commands();$$
);