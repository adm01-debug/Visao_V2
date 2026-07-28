-- Onda 190 — Conexão por Registro (device enrollment)
-- Segredo NUNCA é armazenado em claro: só o digest SHA-256 hexadecimal.

CREATE TABLE public.device_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  device_code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT 'Dispositivo',
  nvr_id UUID REFERENCES public.nvrs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'revoked')),
  secret_hash TEXT NOT NULL,
  secret_version INTEGER NOT NULL DEFAULT 1 CHECK (secret_version >= 1),
  secret_issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  previous_secret_hash TEXT,
  rotated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  last_seen_ip INET,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Código de registro é sempre maiúsculo/dígito, tamanho fixo 12 (espelha DEVICE_CODE_LENGTH).
  CONSTRAINT device_code_shape CHECK (device_code ~ '^[A-Z0-9]{12}$'),
  -- Segredo é digest hex de 64 caracteres (SHA-256), jamais texto livre.
  CONSTRAINT secret_hash_shape CHECK (secret_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT previous_secret_hash_shape
    CHECK (previous_secret_hash IS NULL OR previous_secret_hash ~ '^[0-9a-f]{64}$'),
  -- Graça de rotação é indivisível: ou há segredo anterior E instante, ou nenhum dos dois.
  CONSTRAINT rotation_grace_paired
    CHECK ((previous_secret_hash IS NULL) = (rotated_at IS NULL)),
  -- Um segredo nunca é reemitido igual ao anterior.
  CONSTRAINT secret_differs_from_previous
    CHECK (previous_secret_hash IS NULL OR previous_secret_hash <> secret_hash),
  CONSTRAINT revoked_has_timestamp
    CHECK ((status = 'revoked') = (revoked_at IS NOT NULL))
);

CREATE INDEX idx_device_registrations_user ON public.device_registrations (user_id, status);
CREATE INDEX idx_device_registrations_last_seen
  ON public.device_registrations (last_seen_at DESC NULLS LAST);

GRANT SELECT ON public.device_registrations TO authenticated;
GRANT ALL ON public.device_registrations TO service_role;
REVOKE ALL ON public.device_registrations FROM anon;

ALTER TABLE public.device_registrations ENABLE ROW LEVEL SECURITY;

-- Leitura: só o dono. Escrita só por rotinas SECURITY DEFINER (nenhuma policy de escrita).
CREATE POLICY "device_registrations_select_own"
  ON public.device_registrations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Trilha imutável de eventos do vínculo.
CREATE TABLE public.device_registration_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID REFERENCES public.device_registrations(id) ON DELETE SET NULL,
  device_code TEXT NOT NULL,
  user_id UUID,
  event TEXT NOT NULL CHECK (event IN (
    'enrolled', 'activated', 'rotated', 'revoked', 'auth_accepted', 'auth_denied'
  )),
  reason TEXT,
  secret_version INTEGER,
  used_grace BOOLEAN NOT NULL DEFAULT false,
  source_ip INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_device_audit_registration
  ON public.device_registration_audit (registration_id, created_at DESC);

GRANT SELECT ON public.device_registration_audit TO authenticated;
GRANT ALL ON public.device_registration_audit TO service_role;
REVOKE ALL ON public.device_registration_audit FROM anon;

ALTER TABLE public.device_registration_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "device_audit_select_own"
  ON public.device_registration_audit FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Trilha é append-only: nada de reescrever a história do vínculo.
CREATE OR REPLACE FUNCTION public.block_device_audit_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'device_registration_audit é imutável (append-only)';
END;
$$;

CREATE TRIGGER trg_device_audit_immutable
  BEFORE UPDATE OR DELETE ON public.device_registration_audit
  FOR EACH ROW EXECUTE FUNCTION public.block_device_audit_mutation();

-- Guarda de governança: revogação é terminal e a graça morre junto com o vínculo.
CREATE OR REPLACE FUNCTION public.enforce_device_registration_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Revogação é terminal: nunca volta a pending/active.
    IF OLD.status = 'revoked' AND NEW.status <> 'revoked' THEN
      RAISE EXCEPTION 'dispositivo revogado não pode ser reativado (%).', OLD.device_code;
    END IF;
    -- Código de registro é identidade: imutável.
    IF NEW.device_code <> OLD.device_code THEN
      RAISE EXCEPTION 'device_code é imutável';
    END IF;
    -- Versão do segredo nunca retrocede.
    IF NEW.secret_version < OLD.secret_version THEN
      RAISE EXCEPTION 'secret_version não pode retroceder (% -> %)', OLD.secret_version, NEW.secret_version;
    END IF;
    -- Prova de vida nunca anda para trás.
    IF NEW.last_seen_at IS NOT NULL AND OLD.last_seen_at IS NOT NULL
       AND NEW.last_seen_at < OLD.last_seen_at THEN
      NEW.last_seen_at := OLD.last_seen_at;
    END IF;
  END IF;

  IF NEW.status = 'revoked' THEN
    NEW.previous_secret_hash := NULL;
    NEW.rotated_at := NULL;
    NEW.revoked_at := COALESCE(NEW.revoked_at, now());
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_device_registration_rules
  BEFORE INSERT OR UPDATE ON public.device_registrations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_device_registration_rules();