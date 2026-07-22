
ALTER TABLE public.camera_credentials
  ADD COLUMN IF NOT EXISTS dek_wrapped BYTEA,
  ADD COLUMN IF NOT EXISTS kek_version SMALLINT,
  ADD COLUMN IF NOT EXISTS wrapped_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS camera_credentials_kek_version_idx
  ON public.camera_credentials (kek_version)
  WHERE dek_wrapped IS NOT NULL;

CREATE OR REPLACE FUNCTION public.wrap_dek(p_dek BYTEA, p_kek TEXT)
RETURNS BYTEA LANGUAGE sql IMMUTABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$ SELECT pgp_sym_encrypt(encode(p_dek, 'hex'), p_kek); $$;

CREATE OR REPLACE FUNCTION public.unwrap_dek(p_wrapped BYTEA, p_kek TEXT)
RETURNS BYTEA LANGUAGE sql IMMUTABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$ SELECT decode(pgp_sym_decrypt(p_wrapped, p_kek), 'hex'); $$;

REVOKE ALL ON FUNCTION public.wrap_dek(BYTEA, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.unwrap_dek(BYTEA, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wrap_dek(BYTEA, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.unwrap_dek(BYTEA, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.set_camera_credentials_v2(
  p_camera_id UUID, p_stream_url TEXT, p_kek TEXT, p_kek_version SMALLINT DEFAULT 1
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID; v_dek BYTEA; v_dek_hex TEXT;
  v_username TEXT; v_password TEXT; v_sanitized TEXT;
  v_id UUID; v_match TEXT[];
BEGIN
  IF p_kek IS NULL OR length(p_kek) < 16 THEN RAISE EXCEPTION 'kek_too_short'; END IF;
  v_match := regexp_match(p_stream_url, '^([a-z]+://)([^/@?#]*):([^@]*)@(.*)$', 'i');
  IF v_match IS NOT NULL THEN
    v_username := v_match[2]; v_password := v_match[3]; v_sanitized := v_match[1] || v_match[4];
  ELSE
    v_username := NULL; v_password := NULL; v_sanitized := p_stream_url;
  END IF;

  SELECT user_id INTO v_user_id FROM public.cameras WHERE id = p_camera_id;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'camera_not_found'; END IF;

  v_dek := gen_random_bytes(32);
  v_dek_hex := encode(v_dek, 'hex');

  INSERT INTO public.camera_credentials AS cc
    (camera_id, user_id, username, encrypted_password, sanitized_url,
     key_fingerprint, dek_wrapped, kek_version, wrapped_at)
  VALUES
    (p_camera_id, v_user_id, v_username,
     CASE WHEN v_password IS NOT NULL THEN pgp_sym_encrypt(v_password, v_dek_hex) ELSE NULL END,
     v_sanitized,
     substr(encode(digest(p_kek, 'sha256'), 'hex'), 1, 16),
     public.wrap_dek(v_dek, p_kek),
     p_kek_version, now())
  ON CONFLICT (camera_id) DO UPDATE
    SET username = EXCLUDED.username, encrypted_password = EXCLUDED.encrypted_password,
        sanitized_url = EXCLUDED.sanitized_url, key_fingerprint = EXCLUDED.key_fingerprint,
        dek_wrapped = EXCLUDED.dek_wrapped, kek_version = EXCLUDED.kek_version,
        wrapped_at = EXCLUDED.wrapped_at, updated_at = now()
  RETURNING id INTO v_id;

  UPDATE public.cameras SET stream_url = v_sanitized WHERE id = p_camera_id;
  RETURN v_id;
END; $$;

REVOKE ALL ON FUNCTION public.set_camera_credentials_v2(UUID, TEXT, TEXT, SMALLINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_camera_credentials_v2(UUID, TEXT, TEXT, SMALLINT) TO service_role;

CREATE OR REPLACE FUNCTION public.get_camera_stream_url_v2(p_camera_id UUID, p_kek TEXT)
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_cred RECORD; v_dek_hex TEXT; v_pass TEXT; v_base TEXT;
BEGIN
  SELECT cc.username, cc.encrypted_password, cc.sanitized_url, cc.dek_wrapped
    INTO v_cred FROM public.camera_credentials cc WHERE cc.camera_id = p_camera_id;
  IF NOT FOUND THEN
    SELECT c.stream_url INTO v_base FROM public.cameras c WHERE c.id = p_camera_id;
    RETURN v_base;
  END IF;
  IF v_cred.dek_wrapped IS NULL OR v_cred.encrypted_password IS NULL OR v_cred.username IS NULL THEN
    RETURN v_cred.sanitized_url;
  END IF;
  v_dek_hex := encode(public.unwrap_dek(v_cred.dek_wrapped, p_kek), 'hex');
  v_pass := pgp_sym_decrypt(v_cred.encrypted_password, v_dek_hex);
  RETURN regexp_replace(v_cred.sanitized_url, '^([a-z]+://)',
    '\1' || v_cred.username || ':' || v_pass || '@', 'i');
END; $$;

REVOKE ALL ON FUNCTION public.get_camera_stream_url_v2(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_camera_stream_url_v2(UUID, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.rotate_camera_dek(
  p_camera_id UUID, p_kek TEXT, p_kek_version SMALLINT DEFAULT 1
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_cred RECORD; v_old_dek_hex TEXT; v_pass TEXT; v_new_dek BYTEA; v_new_dek_hex TEXT;
BEGIN
  SELECT * INTO v_cred FROM public.camera_credentials
    WHERE camera_id = p_camera_id FOR UPDATE;
  IF NOT FOUND OR v_cred.dek_wrapped IS NULL THEN RETURN FALSE; END IF;
  v_old_dek_hex := encode(public.unwrap_dek(v_cred.dek_wrapped, p_kek), 'hex');
  v_pass := pgp_sym_decrypt(v_cred.encrypted_password, v_old_dek_hex);
  v_new_dek := gen_random_bytes(32);
  v_new_dek_hex := encode(v_new_dek, 'hex');
  UPDATE public.camera_credentials
     SET encrypted_password = pgp_sym_encrypt(v_pass, v_new_dek_hex),
         dek_wrapped = public.wrap_dek(v_new_dek, p_kek),
         kek_version = p_kek_version, wrapped_at = now(), updated_at = now()
   WHERE camera_id = p_camera_id;
  RETURN TRUE;
END; $$;

REVOKE ALL ON FUNCTION public.rotate_camera_dek(UUID, TEXT, SMALLINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_camera_dek(UUID, TEXT, SMALLINT) TO service_role;

CREATE OR REPLACE FUNCTION public.rewrap_camera_vault_kek(
  p_old_kek TEXT, p_new_kek TEXT, p_from_version SMALLINT, p_to_version SMALLINT, p_limit INT DEFAULT 500
) RETURNS TABLE(rewrapped_count INT, remaining INT) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_row RECORD; v_count INT := 0; v_dek BYTEA; v_remaining INT;
BEGIN
  IF p_new_kek IS NULL OR length(p_new_kek) < 16 THEN RAISE EXCEPTION 'new_kek_too_short'; END IF;
  FOR v_row IN
    SELECT camera_id, dek_wrapped FROM public.camera_credentials
     WHERE dek_wrapped IS NOT NULL
       AND (kek_version = p_from_version OR (p_from_version = 0 AND kek_version IS NULL))
     ORDER BY wrapped_at NULLS FIRST LIMIT p_limit FOR UPDATE SKIP LOCKED
  LOOP
    v_dek := public.unwrap_dek(v_row.dek_wrapped, p_old_kek);
    UPDATE public.camera_credentials
       SET dek_wrapped = public.wrap_dek(v_dek, p_new_kek),
           kek_version = p_to_version, wrapped_at = now(), updated_at = now()
     WHERE camera_id = v_row.camera_id;
    v_count := v_count + 1;
  END LOOP;
  SELECT COUNT(*) INTO v_remaining FROM public.camera_credentials
   WHERE dek_wrapped IS NOT NULL
     AND (kek_version = p_from_version OR (p_from_version = 0 AND kek_version IS NULL));
  RETURN QUERY SELECT v_count, v_remaining;
END; $$;

REVOKE ALL ON FUNCTION public.rewrap_camera_vault_kek(TEXT, TEXT, SMALLINT, SMALLINT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rewrap_camera_vault_kek(TEXT, TEXT, SMALLINT, SMALLINT, INT) TO service_role;

CREATE OR REPLACE FUNCTION public.backfill_envelope_encryption(
  p_kek TEXT, p_kek_version SMALLINT DEFAULT 1, p_limit INT DEFAULT 100
) RETURNS TABLE(migrated INT, remaining INT, failed INT) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_row RECORD; v_pass TEXT; v_dek BYTEA; v_dek_hex TEXT;
        v_migrated INT := 0; v_failed INT := 0; v_remaining INT;
BEGIN
  IF p_kek IS NULL OR length(p_kek) < 16 THEN RAISE EXCEPTION 'kek_too_short'; END IF;
  FOR v_row IN
    SELECT camera_id, encrypted_password FROM public.camera_credentials
     WHERE encrypted_password IS NOT NULL AND dek_wrapped IS NULL
     LIMIT p_limit FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      v_pass := pgp_sym_decrypt(v_row.encrypted_password, p_kek);
      v_dek := gen_random_bytes(32);
      v_dek_hex := encode(v_dek, 'hex');
      UPDATE public.camera_credentials
         SET encrypted_password = pgp_sym_encrypt(v_pass, v_dek_hex),
             dek_wrapped = public.wrap_dek(v_dek, p_kek),
             kek_version = p_kek_version, wrapped_at = now(), updated_at = now()
       WHERE camera_id = v_row.camera_id;
      v_migrated := v_migrated + 1;
    EXCEPTION WHEN OTHERS THEN v_failed := v_failed + 1;
    END;
  END LOOP;
  SELECT COUNT(*) INTO v_remaining FROM public.camera_credentials
   WHERE encrypted_password IS NOT NULL AND dek_wrapped IS NULL;
  RETURN QUERY SELECT v_migrated, v_remaining, v_failed;
END; $$;

REVOKE ALL ON FUNCTION public.backfill_envelope_encryption(TEXT, SMALLINT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_envelope_encryption(TEXT, SMALLINT, INT) TO service_role;

CREATE OR REPLACE FUNCTION public.envelope_encryption_stats()
RETURNS TABLE(total BIGINT, enveloped BIGINT, legacy BIGINT, by_kek_version JSONB)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.camera_credentials),
    (SELECT COUNT(*) FROM public.camera_credentials WHERE dek_wrapped IS NOT NULL),
    (SELECT COUNT(*) FROM public.camera_credentials WHERE encrypted_password IS NOT NULL AND dek_wrapped IS NULL),
    COALESCE(
      (SELECT jsonb_object_agg(COALESCE(kek_version::TEXT, 'null'), c)
         FROM (SELECT kek_version, COUNT(*)::INT AS c FROM public.camera_credentials
                WHERE dek_wrapped IS NOT NULL GROUP BY kek_version) t),
      '{}'::jsonb
    );
$$;

REVOKE ALL ON FUNCTION public.envelope_encryption_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.envelope_encryption_stats() TO authenticated, service_role;
