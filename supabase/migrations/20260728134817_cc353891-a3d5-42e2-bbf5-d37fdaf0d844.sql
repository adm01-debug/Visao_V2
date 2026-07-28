-- Onda 194 — Coleta e prestação de contas dos comandos remotos.
--
-- A fila da Onda 193 sabia admitir ordens, mas não sabia contá-las: não havia
-- como distinguir "entregue uma vez" de "entregue três vezes sem laudo". Sem
-- essa contagem, um equipamento mudo consumiria reentregas para sempre e a
-- fila pareceria saudável. Esta migração adiciona a memória da entrega e
-- fecha a máquina de estados com transições explícitas.

ALTER TABLE public.device_remote_commands
  ADD COLUMN IF NOT EXISTS delivery_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reported_at timestamptz;

ALTER TABLE public.device_remote_commands
  DROP CONSTRAINT IF EXISTS device_remote_commands_attempts_check;
ALTER TABLE public.device_remote_commands
  ADD CONSTRAINT device_remote_commands_attempts_check
  CHECK (delivery_attempts >= 0 AND delivery_attempts <= 3);

COMMENT ON COLUMN public.device_remote_commands.delivery_attempts IS
  'Onda 194: quantas vezes a ordem foi oferecida ao equipamento. Teto 3; nunca decresce.';
COMMENT ON COLUMN public.device_remote_commands.reported_at IS
  'Onda 194: instante em que o equipamento prestou contas. Relógio do servidor.';

-- Guarda ampliada: além da imutabilidade de identidade já existente, agora a
-- transição de estado é enumerada. Antes, qualquer estado não-terminal podia
-- virar qualquer outro; bastava um bug de escrita para uma ordem nascer
-- "delivered" sem nunca ter saído do banco.
CREATE OR REPLACE FUNCTION public.guard_device_remote_command()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Contagem de entregas é monotônica: reescrever para baixo apagaria a prova
  -- de que o equipamento já recebeu o ato.
  IF NEW.delivery_attempts < OLD.delivery_attempts THEN
    RAISE EXCEPTION 'contagem de entregas não regride';
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

  -- Entrega sempre carimba relógio e contagem: um "delivered" sem prova de
  -- entrega tornaria o empréstimo de execução incalculável.
  IF NEW.status = 'delivered'
     AND (NEW.delivered_at IS NULL OR NEW.delivery_attempts <= 0) THEN
    RAISE EXCEPTION 'entrega exige carimbo de hora e contagem';
  END IF;

  IF NEW.status IN ('completed','failed')
     AND (OLD.status <> 'delivered' OR NEW.reported_at IS NULL) THEN
    RAISE EXCEPTION 'laudo só existe sobre ordem entregue e com carimbo';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

-- Autoteste dinâmico da entrega: cria, entrega, reentrega, esgota e presta
-- contas dentro de um bloco desfeito ao final. Gate estático não prova que a
-- máquina de estados executa; este exercício prova.
CREATE OR REPLACE FUNCTION public.device_remote_command_delivery_selftest()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid := '00000000-0000-4000-8000-0000000d1940';
  v_reg   uuid := '00000000-0000-4000-8000-0000000d1941';
  v_out   jsonb := '{}'::jsonb;
  v_id    uuid;
BEGIN
  BEGIN
    INSERT INTO public.device_registrations (id, user_id, device_code, secret_hash, status)
      VALUES (v_reg, v_owner, 'CIWAVE194SLF', repeat('b', 64), 'active');

    INSERT INTO public.device_remote_commands
      (user_id, registration_id, command, idempotency_key, expires_at, requested_by)
      VALUES (v_owner, v_reg, 'config.read', 'selftest-194-a',
              now() + interval '20 minutes', v_owner)
      RETURNING id INTO v_id;

    -- 1. Nascer já entregue é proibido.
    BEGIN
      INSERT INTO public.device_remote_commands
        (user_id, registration_id, command, idempotency_key, expires_at, requested_by,
         status, delivered_at, delivery_attempts)
        VALUES (v_owner, v_reg, 'osd.open', 'selftest-194-born',
                now() + interval '5 minutes', v_owner, 'queued', now(), 2);
      v_out := v_out || jsonb_build_object('birth_guard', false);
    EXCEPTION WHEN others THEN
      v_out := v_out || jsonb_build_object('birth_guard', true);
    END;

    -- 2. Entrega sem carimbo é proibida.
    BEGIN
      UPDATE public.device_remote_commands SET status = 'delivered' WHERE id = v_id;
      v_out := v_out || jsonb_build_object('stamp_guard', false);
    EXCEPTION WHEN others THEN
      v_out := v_out || jsonb_build_object('stamp_guard', true);
    END;

    -- 3. Entrega legítima.
    UPDATE public.device_remote_commands
      SET status = 'delivered', delivered_at = now(), delivery_attempts = 1
      WHERE id = v_id;
    v_out := v_out || jsonb_build_object('delivered', true);

    -- 4. Contagem não regride.
    BEGIN
      UPDATE public.device_remote_commands SET delivery_attempts = 0 WHERE id = v_id;
      v_out := v_out || jsonb_build_object('monotonic_guard', false);
    EXCEPTION WHEN others THEN
      v_out := v_out || jsonb_build_object('monotonic_guard', true);
    END;

    -- 5. Voltar para a fila é transição inválida.
    BEGIN
      UPDATE public.device_remote_commands SET status = 'queued' WHERE id = v_id;
      v_out := v_out || jsonb_build_object('transition_guard', false);
    EXCEPTION WHEN others THEN
      v_out := v_out || jsonb_build_object('transition_guard', true);
    END;

    -- 6. Teto de tentativas.
    BEGIN
      UPDATE public.device_remote_commands SET delivery_attempts = 9 WHERE id = v_id;
      v_out := v_out || jsonb_build_object('attempt_ceiling', false);
    EXCEPTION WHEN others THEN
      v_out := v_out || jsonb_build_object('attempt_ceiling', true);
    END;

    -- 7. Laudo sem carimbo de hora é proibido.
    BEGIN
      UPDATE public.device_remote_commands SET status = 'completed' WHERE id = v_id;
      v_out := v_out || jsonb_build_object('report_stamp_guard', false);
    EXCEPTION WHEN others THEN
      v_out := v_out || jsonb_build_object('report_stamp_guard', true);
    END;

    -- 8. Laudo legítimo encerra a ordem.
    UPDATE public.device_remote_commands
      SET status = 'completed', reported_at = now(), result = '{"ok":true}'::jsonb
      WHERE id = v_id;
    v_out := v_out || jsonb_build_object('reported', true);

    RAISE EXCEPTION 'selftest-rollback %', v_out::text;
  EXCEPTION WHEN others THEN
    IF SQLERRM LIKE 'selftest-rollback %' THEN
      RETURN replace(SQLERRM, 'selftest-rollback ', '')::jsonb;
    END IF;
    RETURN jsonb_build_object('error', SQLERRM);
  END;
END;
$function$;

REVOKE ALL ON FUNCTION public.device_remote_command_delivery_selftest() FROM public;
REVOKE ALL ON FUNCTION public.device_remote_command_delivery_selftest() FROM anon;
REVOKE ALL ON FUNCTION public.device_remote_command_delivery_selftest() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.device_remote_command_delivery_selftest() TO service_role;