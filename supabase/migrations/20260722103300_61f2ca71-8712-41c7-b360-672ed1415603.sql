
CREATE OR REPLACE FUNCTION public.rotate_camera_vault_key(old_key text, new_key text)
RETURNS TABLE(rotated_count integer, new_fingerprint text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  rec RECORD;
  plain text;
  cnt integer := 0;
  new_fp text;
BEGIN
  IF old_key IS NULL OR length(old_key) < 16 OR new_key IS NULL OR length(new_key) < 16 THEN
    RAISE EXCEPTION 'keys must be >= 16 chars';
  END IF;

  new_fp := encode(digest(new_key, 'sha256'), 'hex');

  FOR rec IN SELECT id, encrypted_password FROM public.camera_credentials FOR UPDATE LOOP
    BEGIN
      plain := pgp_sym_decrypt(rec.encrypted_password, old_key);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'decrypt failed for credential %; aborting rotation', rec.id;
    END;

    UPDATE public.camera_credentials
       SET encrypted_password = pgp_sym_encrypt(plain, new_key),
           key_fingerprint = new_fp,
           updated_at = now()
     WHERE id = rec.id;

    cnt := cnt + 1;
  END LOOP;

  RETURN QUERY SELECT cnt, new_fp;
END;
$$;

REVOKE ALL ON FUNCTION public.rotate_camera_vault_key(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_camera_vault_key(text, text) TO service_role;
