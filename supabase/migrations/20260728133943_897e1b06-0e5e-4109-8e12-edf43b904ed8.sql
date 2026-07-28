CREATE OR REPLACE FUNCTION public.device_remote_command_selftest()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := '00000000-0000-4000-8000-0000000d1930';
  v_other uuid := '00000000-0000-4000-8000-0000000d1931';
  v_reg   uuid := '00000000-0000-4000-8000-0000000d1932';
  v_out   jsonb := '{}'::jsonb;
  v_id    uuid;
  v_n     integer;
BEGIN
  -- Tudo acontece dentro de um bloco que é desfeito ao final: o autoteste
  -- exercita as guardas de verdade, mas nunca deixa rastro na fila real.
  BEGIN
    INSERT INTO public.device_registrations (id, user_id, device_code, secret_hash, status)
      VALUES (v_reg, v_owner, 'CIWAVE193SLF', repeat('a', 64), 'active');

    -- 1. Comando válido entra.
    INSERT INTO public.device_remote_commands
      (user_id, registration_id, command, idempotency_key, expires_at, requested_by)
      VALUES (v_owner, v_reg, 'device.reboot', 'selftest-193-ok', now() + interval '10 minutes', v_owner)
      RETURNING id INTO v_id;
    v_out := v_out || jsonb_build_object('admitted', v_id IS NOT NULL);

    -- 2. Prazo acima do teto é barrado.
    BEGIN
      INSERT INTO public.device_remote_commands
        (user_id, registration_id, command, idempotency_key, expires_at, requested_by)
        VALUES (v_owner, v_reg, 'config.read', 'selftest-193-ttl', now() + interval '90 minutes', v_owner);
      v_out := v_out || jsonb_build_object('ttl_guard', false);
    EXCEPTION WHEN others THEN
      v_out := v_out || jsonb_build_object('ttl_guard', true);
    END;

    -- 3. Segundo comando exclusivo em voo é barrado.
    BEGIN
      INSERT INTO public.device_remote_commands
        (user_id, registration_id, command, idempotency_key, expires_at, requested_by)
        VALUES (v_owner, v_reg, 'stream.restart', 'selftest-193-excl', now() + interval '10 minutes', v_owner);
      v_out := v_out || jsonb_build_object('exclusive_guard', false);
    EXCEPTION WHEN others THEN
      v_out := v_out || jsonb_build_object('exclusive_guard', true);
    END;

    -- 4. Chave de idempotência repetida é barrada.
    BEGIN
      INSERT INTO public.device_remote_commands
        (user_id, registration_id, command, idempotency_key, expires_at, requested_by)
        VALUES (v_owner, v_reg, 'config.read', 'selftest-193-ok', now() + interval '5 minutes', v_owner);
      v_out := v_out || jsonb_build_object('idempotency_guard', false);
    EXCEPTION WHEN others THEN
      v_out := v_out || jsonb_build_object('idempotency_guard', true);
    END;

    -- 5. Comando de outro dono é barrado.
    BEGIN
      INSERT INTO public.device_remote_commands
        (user_id, registration_id, command, idempotency_key, expires_at, requested_by)
        VALUES (v_other, v_reg, 'config.read', 'selftest-193-owner', now() + interval '5 minutes', v_other);
      v_out := v_out || jsonb_build_object('ownership_guard', false);
    EXCEPTION WHEN others THEN
      v_out := v_out || jsonb_build_object('ownership_guard', true);
    END;

    -- 6. Estado encerrado é irreversível.
    UPDATE public.device_remote_commands SET status = 'cancelled' WHERE id = v_id;
    BEGIN
      UPDATE public.device_remote_commands SET status = 'queued' WHERE id = v_id;
      v_out := v_out || jsonb_build_object('terminal_guard', false);
    EXCEPTION WHEN others THEN
      v_out := v_out || jsonb_build_object('terminal_guard', true);
    END;

    -- 7. Expiração é fato do relógio: comando vencido sai da fila sozinho.
    INSERT INTO public.device_remote_commands
      (user_id, registration_id, command, idempotency_key, expires_at, requested_by, created_at)
      VALUES (v_owner, v_reg, 'config.read', 'selftest-193-exp',
              now() - interval '1 second', v_owner, now() - interval '2 minutes');
    SELECT public.expire_device_remote_commands() INTO v_n;
    v_out := v_out || jsonb_build_object('expired', v_n >= 1);

    RAISE EXCEPTION 'selftest-rollback %', v_out::text;
  EXCEPTION WHEN others THEN
    IF SQLERRM LIKE 'selftest-rollback %' THEN
      RETURN replace(SQLERRM, 'selftest-rollback ', '')::jsonb;
    END IF;
    RAISE;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.device_remote_command_selftest() FROM public;
REVOKE ALL ON FUNCTION public.device_remote_command_selftest() FROM anon;
REVOKE ALL ON FUNCTION public.device_remote_command_selftest() FROM authenticated;