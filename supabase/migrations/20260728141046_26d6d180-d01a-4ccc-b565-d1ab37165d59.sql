CREATE OR REPLACE FUNCTION public.device_remote_command_sweep_selftest()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := '00000000-0000-4000-8000-0000000d1950';
  v_reg   uuid := '00000000-0000-4000-8000-0000000d1951';
  v_out   jsonb := '{}'::jsonb;
  v_t0    timestamptz := now();
  v_cut   timestamptz := now() + interval '30 seconds';
  v_alive uuid; v_dead uuid; v_stale uuid; v_done uuid;
  v_res   jsonb;
  v_status text;
BEGIN
  BEGIN
    INSERT INTO public.device_registrations (id, user_id, device_code, secret_hash, status)
      VALUES (v_reg, v_owner, 'CIWAVE195SLF', repeat('c', 64), 'active');

    -- 1. Viva: entregue agora; no corte (+30s) o empréstimo de 60s ainda corre.
    INSERT INTO public.device_remote_commands
      (user_id, registration_id, command, idempotency_key, expires_at, requested_by)
      VALUES (v_owner, v_reg, 'config.read', 'selftest-195-alive',
              v_t0 + interval '20 minutes', v_owner)
      RETURNING id INTO v_alive;
    UPDATE public.device_remote_commands
       SET status='delivered', delivered_at=v_t0, delivery_attempts=3 WHERE id=v_alive;

    -- 2. Abandonada: tentativas esgotadas e empréstimo vencido no corte.
    INSERT INTO public.device_remote_commands
      (user_id, registration_id, command, idempotency_key, expires_at, requested_by)
      VALUES (v_owner, v_reg, 'clock.sync', 'selftest-195-dead',
              v_t0 + interval '20 minutes', v_owner)
      RETURNING id INTO v_dead;
    UPDATE public.device_remote_commands
       SET status='delivered', delivered_at=v_t0 - interval '5 minutes', delivery_attempts=3
     WHERE id=v_dead;

    -- 3. Vencida sem nunca ter sido entregue (prazo antes do corte).
    INSERT INTO public.device_remote_commands
      (user_id, registration_id, command, idempotency_key, expires_at, requested_by)
      VALUES (v_owner, v_reg, 'osd.open', 'selftest-195-stale',
              v_t0 + interval '10 seconds', v_owner)
      RETURNING id INTO v_stale;

    -- 4. Já encerrada pelo equipamento: inerte.
    INSERT INTO public.device_remote_commands
      (user_id, registration_id, command, idempotency_key, expires_at, requested_by)
      VALUES (v_owner, v_reg, 'osd.apply', 'selftest-195-done',
              v_t0 + interval '20 minutes', v_owner)
      RETURNING id INTO v_done;
    UPDATE public.device_remote_commands
       SET status='delivered', delivered_at=v_t0, delivery_attempts=1 WHERE id=v_done;
    UPDATE public.device_remote_commands
       SET status='completed', reported_at=v_t0, settled_by='device',
           result='{"ok":true}'::jsonb
     WHERE id=v_done;

    v_res := public.sweep_device_remote_commands(v_cut, 500);
    v_out := v_out || jsonb_build_object('run', v_res);

    SELECT status INTO v_status FROM public.device_remote_commands WHERE id=v_alive;
    v_out := v_out || jsonb_build_object('alive_untouched', v_status = 'delivered');

    SELECT status INTO v_status FROM public.device_remote_commands WHERE id=v_dead;
    v_out := v_out || jsonb_build_object('exhausted_failed', v_status = 'failed');

    SELECT status INTO v_status FROM public.device_remote_commands WHERE id=v_stale;
    v_out := v_out || jsonb_build_object('stale_expired', v_status = 'expired');

    SELECT status INTO v_status FROM public.device_remote_commands WHERE id=v_done;
    v_out := v_out || jsonb_build_object('settled_inert', v_status = 'completed');

    v_out := v_out || jsonb_build_object(
      'no_fabricated_report',
      (SELECT reported_at IS NULL AND settled_by = 'sweep'
         FROM public.device_remote_commands WHERE id=v_dead));

    v_res := public.sweep_device_remote_commands(v_cut, 500);
    v_out := v_out || jsonb_build_object('idempotent', (v_res->>'total')::int = 0);

    -- Teto de lote respeitado (nunca altera veredito, só adia).
    v_out := v_out || jsonb_build_object(
      'batch_limit', (public.sweep_device_remote_commands(v_cut, 0)->>'total')::int = 0);

    BEGIN
      UPDATE public.device_remote_commands
         SET status='completed', settled_by='sweep' WHERE id=v_alive;
      v_out := v_out || jsonb_build_object('sweep_success_guard', false);
    EXCEPTION WHEN others THEN
      v_out := v_out || jsonb_build_object('sweep_success_guard', true);
    END;

    BEGIN
      UPDATE public.device_remote_commands SET settled_by='device' WHERE id=v_dead;
      v_out := v_out || jsonb_build_object('authorship_guard', false);
    EXCEPTION WHEN others THEN
      v_out := v_out || jsonb_build_object('authorship_guard', true);
    END;

    RAISE EXCEPTION 'selftest-rollback %', v_out::text;
  EXCEPTION WHEN others THEN
    IF SQLERRM LIKE 'selftest-rollback %' THEN
      RETURN replace(SQLERRM, 'selftest-rollback ', '')::jsonb;
    END IF;
    RETURN jsonb_build_object('error', SQLERRM);
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.device_remote_command_sweep_selftest() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.device_remote_command_sweep_selftest() FROM anon;
REVOKE ALL ON FUNCTION public.device_remote_command_sweep_selftest() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.device_remote_command_sweep_selftest() TO service_role;