BEGIN;
DO $$
DECLARE
  v_uid uuid;
  v_cam uuid := gen_random_uuid();
  v_now timestamptz := '2026-07-27 12:00:00+00';
  r record;
  ok boolean := true;
BEGIN
  SELECT user_id INTO v_uid FROM public.user_roles LIMIT 1;
  IF v_uid IS NULL THEN SELECT user_id INTO v_uid FROM public.cameras LIMIT 1; END IF;
  IF v_uid IS NULL THEN RAISE EXCEPTION 'sem usuario para o exercicio'; END IF;
  INSERT INTO public.cameras (id, user_id, name, location, status)
  VALUES (v_cam, v_uid, 'w153', 'lab', 'offline');

  INSERT INTO public.connectivity_resolution_telemetry
    (user_id, camera_id, error_code, chosen_path, succeeded, retry_error_code, created_at)
  VALUES
    (v_uid, v_cam, 'private_host_blocked', 'direct', false, 'timeout',      v_now - interval '1 min'),
    (v_uid, v_cam, 'private_host_blocked', 'direct', false, 'reset',        v_now - interval '2 min'),
    (v_uid, v_cam, 'private_host_blocked', 'direct', false, 'unauthorized', v_now - interval '3 min'),
    (v_uid, v_cam, 'private_host_blocked', 'direct', true,  null,           v_now - interval '4 min'),
    (v_uid, v_cam, 'private_host_blocked', 'direct', false, 'refused',      v_now - interval '5 min'),
    (v_uid, v_cam, 'private_host_blocked', 'direct', null,  'timeout',      v_now - interval '6 min'),
    (v_uid, v_cam, 'private_host_blocked', 'cancelled', false, 'timeout',   v_now - interval '7 min'),
    (v_uid, v_cam, 'private_host_blocked', 'vpn', false, 'unauthorized',    v_now - interval '2 min'),
    (v_uid, v_cam, 'private_host_blocked', 'vpn', false, 'lixo_desconhecido', v_now - interval '9 min'),
    (v_uid, v_cam, 'private_host_blocked', 'relay', false, 'timeout',       v_now - interval '3 day');

  FOR r IN SELECT * FROM public.connectivity_path_evidence(v_cam, 1440, v_now) ORDER BY path LOOP
    RAISE NOTICE 'path=% att=% ok=% ctf=% last_tf=% kind=%',
      r.path, r.attempts, r.successes, r.consecutive_transport_failures,
      r.last_transport_failure_at, r.last_failure_kind;
    IF r.path = 'direct' THEN
      IF r.attempts <> 5 OR r.successes <> 1 OR r.consecutive_transport_failures <> 2
         OR r.last_failure_kind <> 'transport'
         OR r.last_transport_failure_at <> v_now - interval '1 min' THEN
        ok := false; RAISE WARNING 'FALHA direct'; END IF;
    ELSIF r.path = 'vpn' THEN
      IF r.attempts <> 2 OR r.successes <> 0 OR r.consecutive_transport_failures <> 0
         OR r.last_transport_failure_at IS NOT NULL OR r.last_failure_kind <> 'auth' THEN
        ok := false; RAISE WARNING 'FALHA vpn'; END IF;
    ELSE
      ok := false; RAISE WARNING 'caminho inesperado %', r.path;
    END IF;
  END LOOP;

  IF ok THEN RAISE NOTICE 'WAVE153 OK'; ELSE RAISE EXCEPTION 'WAVE153 FALHOU'; END IF;
END $$;
ROLLBACK;
