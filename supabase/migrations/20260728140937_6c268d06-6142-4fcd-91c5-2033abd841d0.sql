-- ===========================================================================
-- Onda 195 — Varredura de ordens abandonadas (device_remote_commands)
-- ===========================================================================
-- A Onda 194 só aplica suas regras quando alguém aparece (poll ou laudo).
-- Quando o equipamento some para sempre, a ordem fica viva no histórico e,
-- pior, mantém o índice de exclusividade bloqueando novos atos físicos.
--
-- Esta migração:
--   1. registra a AUTORIA do encerramento (`settled_by`), para que "a varredura
--      desistiu" nunca se confunda com "o equipamento reportou";
--   2. endurece o guard para que a varredura não possa inventar laudo;
--   3. cria a rotina `sweep_device_remote_commands(p_now, p_limit)`, espelho
--      exato de `src/lib/devices/commandSweep.ts`;
--   4. cria o autoteste `device_remote_command_sweep_selftest()` (Onda 141:
--      gate estático não prova execução);
--   5. agenda a varredura a cada 5 minutos.
-- ---------------------------------------------------------------------------

ALTER TABLE public.device_remote_commands
  ADD COLUMN IF NOT EXISTS settled_by text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'device_remote_commands_settled_by_check'
  ) THEN
    ALTER TABLE public.device_remote_commands
      ADD CONSTRAINT device_remote_commands_settled_by_check
      CHECK (settled_by IS NULL OR settled_by IN ('device','sweep'));
  END IF;
END $$;

COMMENT ON COLUMN public.device_remote_commands.settled_by IS
  'Autoria do encerramento: device = o equipamento prestou contas; sweep = ausência observada pela varredura. NULL = ainda aberto ou encerrado antes da Onda 195.';

-- --- Guard endurecido -------------------------------------------------------
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
    IF NEW.delivery_attempts <> 0 OR NEW.delivered_at IS NOT NULL
       OR NEW.reported_at IS NOT NULL THEN
      RAISE EXCEPTION 'comando nasce sem histórico de entrega';
    END IF;
    IF NEW.settled_by IS NOT NULL THEN
      RAISE EXCEPTION 'comando nasce sem autoria de encerramento';
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

  -- Contagem de entregas é monotônica.
  IF NEW.delivery_attempts < OLD.delivery_attempts THEN
    RAISE EXCEPTION 'contagem de entregas não regride';
  END IF;

  -- Autoria do encerramento é escrita uma única vez.
  IF OLD.settled_by IS NOT NULL AND NEW.settled_by IS DISTINCT FROM OLD.settled_by THEN
    RAISE EXCEPTION 'autoria de encerramento é imutável';
  END IF;

  -- Máquina de estados explícita.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status IN ('queued','awaiting_presence')
        AND NEW.status IN ('delivered','cancelled','expired'))
      OR (OLD.status = 'delivered'
        AND NEW.status IN ('completed','failed','expired'))
    ) THEN
      RAISE EXCEPTION 'transição inválida: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;

  IF NEW.status = 'delivered'
     AND (NEW.delivered_at IS NULL OR NEW.delivery_attempts <= 0) THEN
    RAISE EXCEPTION 'entrega exige carimbo de hora e contagem';
  END IF;

  IF NEW.status IN ('completed','failed') THEN
    IF OLD.status <> 'delivered' THEN
      RAISE EXCEPTION 'laudo só existe sobre ordem entregue';
    END IF;
    IF NEW.settled_by = 'sweep' THEN
      -- Ausência observada nunca vira sucesso, e nunca fabrica laudo.
      IF NEW.status <> 'failed' OR NEW.reported_at IS NOT NULL OR NEW.result IS NOT NULL THEN
        RAISE EXCEPTION 'varredura não inventa laudo do equipamento';
      END IF;
    ELSIF NEW.reported_at IS NULL THEN
      RAISE EXCEPTION 'laudo só existe sobre ordem entregue e com carimbo';
    END IF;
  END IF;

  -- Autoria 'device' pressupõe laudo real.
  IF NEW.settled_by = 'device' AND NEW.reported_at IS NULL THEN
    RAISE EXCEPTION 'autoria do equipamento exige laudo carimbado';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- --- Varredura --------------------------------------------------------------
-- Espelho de planSweep()/judgeSweep(). A ordem das perguntas é a mesma:
-- prazo antes de empréstimo; esgotamento só para ordem dentro do prazo.
CREATE OR REPLACE FUNCTION public.sweep_device_remote_commands(
  p_now timestamptz DEFAULT now(),
  p_limit integer DEFAULT 500
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lease   interval := interval '60 seconds';  -- DELIVERY_LEASE_MS
  v_max     integer  := 3;                      -- MAX_DELIVERY_ATTEMPTS
  v_limit   integer  := greatest(0, coalesce(p_limit, 500));
  v_now     timestamptz := coalesce(p_now, now());
  v_undeliv integer := 0;
  v_inflight integer := 0;
  v_exhausted integer := 0;
BEGIN
  -- A. Venceu sem nunca ter chegado ao equipamento.
  WITH cand AS (
    SELECT id FROM public.device_remote_commands
     WHERE status IN ('queued','awaiting_presence')
       AND expires_at <= v_now
     ORDER BY expires_at
     LIMIT v_limit
  )
  UPDATE public.device_remote_commands c
     SET status = 'expired',
         settled_by = 'sweep',
         error_message = coalesce(c.error_message, 'sweep:expired_undelivered')
    FROM cand WHERE c.id = cand.id;
  GET DIAGNOSTICS v_undeliv = ROW_COUNT;

  -- B. Venceu depois de entregue, sem laudo: destino incerto, nunca sucesso.
  WITH cand AS (
    SELECT id FROM public.device_remote_commands
     WHERE status = 'delivered'
       AND expires_at <= v_now
     ORDER BY expires_at
     LIMIT v_limit
  )
  UPDATE public.device_remote_commands c
     SET status = 'expired',
         settled_by = 'sweep',
         error_message = coalesce(c.error_message, 'sweep:expired_in_flight')
    FROM cand WHERE c.id = cand.id;
  GET DIAGNOSTICS v_inflight = ROW_COUNT;

  -- C. Reentregas esgotadas e empréstimo órfão, ainda dentro do prazo.
  --    As duas condições valem juntas: só o contador fecharia ordem em plena
  --    execução na terceira tentativa.
  WITH cand AS (
    SELECT id FROM public.device_remote_commands
     WHERE status = 'delivered'
       AND expires_at > v_now
       AND delivery_attempts >= v_max
       AND delivered_at IS NOT NULL
       AND delivered_at + v_lease <= v_now
     ORDER BY delivered_at
     LIMIT v_limit
  )
  UPDATE public.device_remote_commands c
     SET status = 'failed',
         settled_by = 'sweep',
         error_message = coalesce(c.error_message, 'sweep:delivery_exhausted')
    FROM cand WHERE c.id = cand.id;
  GET DIAGNOSTICS v_exhausted = ROW_COUNT;

  RETURN jsonb_build_object(
    'at', v_now,
    'expired_undelivered', v_undeliv,
    'expired_in_flight', v_inflight,
    'delivery_exhausted', v_exhausted,
    'total', v_undeliv + v_inflight + v_exhausted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sweep_device_remote_commands(timestamptz, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sweep_device_remote_commands(timestamptz, integer) FROM anon;
REVOKE ALL ON FUNCTION public.sweep_device_remote_commands(timestamptz, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.sweep_device_remote_commands(timestamptz, integer) TO service_role;

-- --- Autoteste --------------------------------------------------------------
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
  v_alive uuid; v_dead uuid; v_stale uuid; v_done uuid;
  v_res   jsonb;
  v_status text;
BEGIN
  BEGIN
    INSERT INTO public.device_registrations (id, user_id, device_code, secret_hash, status)
      VALUES (v_reg, v_owner, 'CIWAVE195SLF', repeat('c', 64), 'active');

    -- 1. Ordem viva: entregue agora, terceira tentativa, empréstimo correndo.
    INSERT INTO public.device_remote_commands
      (user_id, registration_id, command, idempotency_key, expires_at, requested_by)
      VALUES (v_owner, v_reg, 'config.read', 'selftest-195-alive',
              now() + interval '20 minutes', v_owner)
      RETURNING id INTO v_alive;
    UPDATE public.device_remote_commands
       SET status='delivered', delivered_at=now(), delivery_attempts=3 WHERE id=v_alive;

    -- 2. Ordem abandonada: empréstimo vencido e tentativas esgotadas.
    INSERT INTO public.device_remote_commands
      (user_id, registration_id, command, idempotency_key, expires_at, requested_by)
      VALUES (v_owner, v_reg, 'clock.sync', 'selftest-195-dead',
              now() + interval '20 minutes', v_owner)
      RETURNING id INTO v_dead;
    UPDATE public.device_remote_commands
       SET status='delivered', delivered_at=now() - interval '5 minutes', delivery_attempts=3
     WHERE id=v_dead;

    -- 3. Ordem vencida nunca entregue.
    INSERT INTO public.device_remote_commands
      (user_id, registration_id, command, idempotency_key, expires_at, requested_by)
      VALUES (v_owner, v_reg, 'osd.open', 'selftest-195-stale',
              now() + interval '1 minute', v_owner)
      RETURNING id INTO v_stale;

    -- 4. Ordem já encerrada pelo equipamento: inerte.
    INSERT INTO public.device_remote_commands
      (user_id, registration_id, command, idempotency_key, expires_at, requested_by)
      VALUES (v_owner, v_reg, 'osd.apply', 'selftest-195-done',
              now() + interval '20 minutes', v_owner)
      RETURNING id INTO v_done;
    UPDATE public.device_remote_commands
       SET status='delivered', delivered_at=now(), delivery_attempts=1 WHERE id=v_done;
    UPDATE public.device_remote_commands
       SET status='completed', reported_at=now(), settled_by='device',
           result='{"ok":true}'::jsonb
     WHERE id=v_done;

    -- Varredura no futuro: o prazo de (3) já passou, o de (1)/(2) não.
    v_res := public.sweep_device_remote_commands(now() + interval '2 minutes', 500);
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

    -- Segunda passada é inerte (idempotência da varredura).
    v_res := public.sweep_device_remote_commands(now() + interval '2 minutes', 500);
    v_out := v_out || jsonb_build_object('idempotent', (v_res->>'total')::int = 0);

    -- Varredura jamais produz 'completed'.
    BEGIN
      UPDATE public.device_remote_commands
         SET status='completed', settled_by='sweep' WHERE id=v_alive;
      v_out := v_out || jsonb_build_object('sweep_success_guard', false);
    EXCEPTION WHEN others THEN
      v_out := v_out || jsonb_build_object('sweep_success_guard', true);
    END;

    -- Autoria não se reescreve.
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

-- --- Agenda -----------------------------------------------------------------
DO $$
BEGIN
  PERFORM cron.unschedule('sweep-device-remote-commands');
EXCEPTION WHEN others THEN NULL;
END $$;

SELECT cron.schedule(
  'sweep-device-remote-commands',
  '*/5 * * * *',
  $$SELECT public.sweep_device_remote_commands();$$
);