-- Onda Fortress 1 — Cofre de credenciais RTSP com pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.camera_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id uuid NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  username text,
  encrypted_password bytea,
  sanitized_url text NOT NULL,
  key_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT camera_credentials_camera_unique UNIQUE (camera_id)
);

CREATE INDEX IF NOT EXISTS camera_credentials_user_idx
  ON public.camera_credentials(user_id);

-- Nunca expor encrypted_password ao cliente: apenas service_role
GRANT SELECT (id, camera_id, user_id, username, sanitized_url, key_fingerprint, created_at, updated_at)
  ON public.camera_credentials TO authenticated;
GRANT ALL ON public.camera_credentials TO service_role;

ALTER TABLE public.camera_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creds owner select"
  ON public.camera_credentials FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "creds owner insert"
  ON public.camera_credentials FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "creds owner update"
  ON public.camera_credentials FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "creds owner delete"
  ON public.camera_credentials FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_camera_credentials_updated_at
  BEFORE UPDATE ON public.camera_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extrair credenciais de uma URL (regex simples e determinística)
CREATE OR REPLACE FUNCTION public.extract_url_credentials(_url text)
RETURNS TABLE(sanitized text, username text, password text)
LANGUAGE plpgsql IMMUTABLE SET search_path = public
AS $$
DECLARE
  scheme text; rest text; authpart text; hostpart text;
  m text[];
BEGIN
  IF _url IS NULL OR position('://' in _url) = 0 THEN
    RETURN QUERY SELECT _url, NULL::text, NULL::text; RETURN;
  END IF;
  scheme := split_part(_url, '://', 1);
  rest   := substring(_url from position('://' in _url) + 3);
  IF position('@' in rest) > 0 AND position('@' in rest) < COALESCE(NULLIF(position('/' in rest),0), length(rest)+1) THEN
    authpart := split_part(rest, '@', 1);
    hostpart := substring(rest from position('@' in rest) + 1);
    m := regexp_match(authpart, '^([^:]*)(?::(.*))?$');
    RETURN QUERY SELECT scheme || '://' || hostpart,
                        NULLIF(m[1], ''),
                        CASE WHEN m[2] IS NOT NULL THEN m[2] ELSE NULL END;
  ELSE
    RETURN QUERY SELECT _url, NULL::text, NULL::text;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.extract_url_credentials(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.extract_url_credentials(text) TO authenticated, service_role;

-- Grava credenciais criptografadas (chave fornecida pela edge function)
CREATE OR REPLACE FUNCTION public.set_camera_credentials(
  _camera_id uuid, _url text, _key text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  ex record; owner uuid; cred_id uuid;
BEGIN
  IF _key IS NULL OR length(_key) < 16 THEN
    RAISE EXCEPTION 'invalid encryption key';
  END IF;
  SELECT user_id INTO owner FROM public.cameras WHERE id = _camera_id;
  IF owner IS NULL THEN RAISE EXCEPTION 'camera not found'; END IF;
  IF owner <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO ex FROM public.extract_url_credentials(_url);
  INSERT INTO public.camera_credentials
    (camera_id, user_id, username, encrypted_password, sanitized_url, key_fingerprint)
  VALUES (
    _camera_id, owner, ex.username,
    CASE WHEN ex.password IS NOT NULL THEN pgp_sym_encrypt(ex.password, _key) ELSE NULL END,
    ex.sanitized,
    encode(digest(_key, 'sha256'), 'hex')
  )
  ON CONFLICT (camera_id) DO UPDATE SET
    username = EXCLUDED.username,
    encrypted_password = EXCLUDED.encrypted_password,
    sanitized_url = EXCLUDED.sanitized_url,
    key_fingerprint = EXCLUDED.key_fingerprint,
    updated_at = now()
  RETURNING id INTO cred_id;
  -- Remove credenciais do stream_url em cameras (defesa em profundidade)
  UPDATE public.cameras SET stream_url = ex.sanitized WHERE id = _camera_id;
  RETURN cred_id;
END $$;

REVOKE ALL ON FUNCTION public.set_camera_credentials(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_camera_credentials(uuid, text, text) TO authenticated, service_role;

-- Reidrata URL com credenciais para uso interno (edge function/worker)
CREATE OR REPLACE FUNCTION public.get_camera_stream_url(_camera_id uuid, _key text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record; pwd text; scheme text; rest text; hostpart text; userpart text;
BEGIN
  SELECT c.*, cr.username, cr.encrypted_password, cr.sanitized_url, cr.key_fingerprint
    INTO r
  FROM public.cameras c
  LEFT JOIN public.camera_credentials cr ON cr.camera_id = c.id
  WHERE c.id = _camera_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'camera not found'; END IF;
  IF r.user_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF r.encrypted_password IS NULL AND r.username IS NULL THEN
    RETURN COALESCE(r.sanitized_url, r.stream_url);
  END IF;
  IF r.key_fingerprint <> encode(digest(_key, 'sha256'), 'hex') THEN
    RAISE EXCEPTION 'key mismatch';
  END IF;
  pwd := CASE WHEN r.encrypted_password IS NOT NULL
              THEN pgp_sym_decrypt(r.encrypted_password, _key) ELSE NULL END;
  scheme := split_part(r.sanitized_url, '://', 1);
  rest   := substring(r.sanitized_url from position('://' in r.sanitized_url) + 3);
  userpart := COALESCE(r.username, '');
  IF pwd IS NOT NULL THEN userpart := userpart || ':' || pwd; END IF;
  RETURN scheme || '://' || userpart || '@' || rest;
END $$;

REVOKE ALL ON FUNCTION public.get_camera_stream_url(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_camera_stream_url(uuid, text) TO service_role;

-- Auditoria: câmeras que ainda têm credenciais embutidas no stream_url
CREATE OR REPLACE FUNCTION public.audit_cameras_embedded_credentials()
RETURNS TABLE(camera_id uuid, name text, stream_url_masked text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name,
         regexp_replace(stream_url, '://[^/@]+@', '://***@') AS stream_url_masked
  FROM public.cameras
  WHERE stream_url ~ '://[^/@]+:[^/@]*@'
    AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
$$;

REVOKE ALL ON FUNCTION public.audit_cameras_embedded_credentials() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_cameras_embedded_credentials() TO authenticated, service_role;