-- Trigger functions da Onda 190 não são API pública.
REVOKE ALL ON FUNCTION public.block_device_audit_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_device_registration_rules() FROM PUBLIC, anon, authenticated;

-- Inscrição: o segredo em claro existe UMA única vez, no retorno desta chamada.
CREATE OR REPLACE FUNCTION public.enroll_device(
  p_label TEXT,
  p_nvr_id UUID DEFAULT NULL,
  p_ttl_hours INTEGER DEFAULT NULL
)
RETURNS TABLE (device_code TEXT, device_secret TEXT, registration_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_code TEXT;
  v_secret TEXT;
  v_id UUID;
  v_attempts INTEGER := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'autenticação obrigatória';
  END IF;
  IF coalesce(btrim(p_label), '') = '' THEN
    RAISE EXCEPTION 'rótulo do dispositivo é obrigatório';
  END IF;
  IF p_ttl_hours IS NOT NULL AND p_ttl_hours <= 0 THEN
    RAISE EXCEPTION 'prazo inválido';
  END IF;

  -- Código legível de 12 caracteres, sem colisão.
  LOOP
    v_attempts := v_attempts + 1;
    v_code := upper(translate(
      encode(extensions.gen_random_bytes(9), 'base64'),
      '+/=', 'XYZ'
    ));
    v_code := substr(regexp_replace(v_code, '[^A-Z0-9]', 'Q', 'g'), 1, 12);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.device_registrations d WHERE d.device_code = v_code);
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'não foi possível gerar código único';
    END IF;
  END LOOP;

  v_secret := encode(extensions.gen_random_bytes(32), 'hex');

  INSERT INTO public.device_registrations (
    user_id, device_code, label, nvr_id, status, secret_hash, expires_at
  ) VALUES (
    v_user, v_code, btrim(p_label), p_nvr_id, 'active',
    encode(extensions.digest(v_secret, 'sha256'), 'hex'),
    CASE WHEN p_ttl_hours IS NULL THEN NULL ELSE now() + make_interval(hours => p_ttl_hours) END
  )
  RETURNING id INTO v_id;

  INSERT INTO public.device_registration_audit (
    registration_id, device_code, user_id, event, reason, secret_version
  ) VALUES (v_id, v_code, v_user, 'enrolled', 'enroll_device', 1);

  RETURN QUERY SELECT v_code, v_secret, v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enroll_device(TEXT, UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enroll_device(TEXT, UUID, INTEGER) TO authenticated;

-- Rotação: graça de 5 minutos para o segredo anterior (espelha ROTATION_GRACE_MS).
CREATE OR REPLACE FUNCTION public.rotate_device_secret(p_registration_id UUID)
RETURNS TABLE (device_code TEXT, device_secret TEXT, secret_version INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_reg public.device_registrations;
  v_secret TEXT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'autenticação obrigatória';
  END IF;

  SELECT * INTO v_reg FROM public.device_registrations d
   WHERE d.id = p_registration_id AND d.user_id = v_user
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'dispositivo não encontrado';
  END IF;
  IF v_reg.status = 'revoked' THEN
    RAISE EXCEPTION 'dispositivo revogado não pode rotacionar segredo';
  END IF;

  v_secret := encode(extensions.gen_random_bytes(32), 'hex');

  UPDATE public.device_registrations d
     SET previous_secret_hash = d.secret_hash,
         rotated_at = now(),
         secret_hash = encode(extensions.digest(v_secret, 'sha256'), 'hex'),
         secret_version = d.secret_version + 1,
         secret_issued_at = now(),
         status = 'active'
   WHERE d.id = p_registration_id
   RETURNING d.* INTO v_reg;

  INSERT INTO public.device_registration_audit (
    registration_id, device_code, user_id, event, reason, secret_version
  ) VALUES (v_reg.id, v_reg.device_code, v_user, 'rotated', 'rotate_device_secret', v_reg.secret_version);

  RETURN QUERY SELECT v_reg.device_code, v_secret, v_reg.secret_version;
END;
$$;

REVOKE ALL ON FUNCTION public.rotate_device_secret(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rotate_device_secret(UUID) TO authenticated;

-- Revogação: terminal e idempotente.
CREATE OR REPLACE FUNCTION public.revoke_device(p_registration_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_reg public.device_registrations;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'autenticação obrigatória';
  END IF;

  SELECT * INTO v_reg FROM public.device_registrations d
   WHERE d.id = p_registration_id AND d.user_id = v_user
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'dispositivo não encontrado';
  END IF;
  IF v_reg.status = 'revoked' THEN
    RETURN false; -- idempotente: já estava revogado, nada muda e nada é registrado de novo
  END IF;

  UPDATE public.device_registrations d
     SET status = 'revoked', revoked_at = now()
   WHERE d.id = p_registration_id;

  INSERT INTO public.device_registration_audit (
    registration_id, device_code, user_id, event, reason, secret_version
  ) VALUES (v_reg.id, v_reg.device_code, v_user, 'revoked',
            coalesce(btrim(p_reason), 'revoke_device'), v_reg.secret_version);

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_device(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_device(UUID, TEXT) TO authenticated;