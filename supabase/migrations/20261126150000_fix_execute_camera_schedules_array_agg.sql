BEGIN;

-- ROLLBACK: reaplicar SOMENTE a definicao anterior de
-- public.execute_camera_schedules(), que esta em
-- supabase/migrations/20260721223250_826b4eec-9373-499c-a8dd-ca1ec3bc9c2e.sql:141-197
-- (do `CREATE OR REPLACE FUNCTION public.execute_camera_schedules()` ate o `END $$;`).
-- A linha que precisa voltar e exatamente:
--     SELECT array_agg(id) INTO cams FROM public.resolve_schedule_cameras(
--       sched.user_id, sched.scope, sched.camera_id, sched.group_id
--     );
-- NAO reexecutar o arquivo 20260721223250 inteiro: ele recria camadas ja
-- existentes (CREATE TABLE, CREATE INDEX, o agendamento do pg_cron) e aborta a
-- transacao. A definicao anterior tem o defeito 42703 (`column "id" does not
-- exist`) a cada execucao, entao o rollback so serve para diagnostico.

-- Fix: execute_camera_schedules agregava a coluna `id` de uma função
-- RETURNS SETOF uuid. A coluna de saída se chama como a função, logo a
-- agregação levantava `column "id" does not exist` (42703), o EXCEPTION do
-- laço registrava status='error' em camera_schedule_runs e nenhuma câmera era
-- armada ou desarmada no horário programado.
-- Confirmado no banco de produção em 2026-11-26:
--   SELECT array_agg(<coluna>) FROM public.resolve_schedule_cameras(gen_random_uuid(), 'all', NULL, NULL)
--   → erro 400: column "id" does not exist

CREATE OR REPLACE FUNCTION public.execute_camera_schedules()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sched RECORD;
  cams UUID[];
  matched BOOLEAN;
  affected INT := 0;
  run_status TEXT;
  run_error TEXT;
  total INT := 0;
BEGIN
  -- Arme antes de desarme, e `created_at, id` para ordem deterministica: quando
  -- dois agendamentos caem no mesmo minuto para a mesma camera, a ultima
  -- gravacao vence, e o desarme precisa vencer (precedencia por camera — ver
  -- scripts/simulate-wave-shinobi-4-scenarios.mjs). Sem o ORDER BY, o PostgreSQL
  -- podia gravar o arme por ultimo e deixar a camera armada.
  FOR sched IN
    SELECT * FROM public.camera_schedules
    WHERE enabled = true
    ORDER BY CASE WHEN action = 'arm' THEN 0 ELSE 1 END, created_at, id
  LOOP
    run_status := 'ok'; run_error := NULL; affected := 0;

    -- O match do cron saiu do WHERE de proposito: um fuso (ou expressao) invalido
    -- levantava excecao ali, fora de qualquer EXCEPTION, e abortava o job inteiro
    -- — todas as cameras de TODOS os usuarios deixavam de armar/desarmar. Agora o
    -- erro fica restrito ao agendamento culpado e o laço continua.
    matched := NULL;
    BEGIN
      matched := public.cron_matches(sched.cron_expression, now(), sched.timezone);
    EXCEPTION WHEN OTHERS THEN
      run_status := 'error'; run_error := SQLERRM;
    END;

    IF matched IS NULL THEN
      -- Um unico registro de erro por transicao: sem o guard o agendamento
      -- invalido gravaria um run por minuto (1.440 por dia) no historico.
      IF sched.last_status IS DISTINCT FROM 'error' THEN
        INSERT INTO public.camera_schedule_runs (schedule_id, user_id, status, affected_cameras, error)
        VALUES (sched.id, sched.user_id, run_status, 0, run_error);
      END IF;
      UPDATE public.camera_schedules
        SET last_run_at = now(), last_status = run_status, last_error = run_error
        WHERE id = sched.id;
      total := total + 1;
      CONTINUE;
    END IF;

    IF NOT matched THEN
      -- Fora do horario: nao gera historico nem toca no agendamento.
      CONTINUE;
    END IF;

    BEGIN
      -- resolve_schedule_cameras devolve um escalar por linha (RETURNS SETOF uuid),
      -- entao a coluna de saida precisa de alias explicito: agrupar `id` aqui
      -- levantava 42703 e abortava a execucao inteira dentro do EXCEPTION.
      SELECT array_agg(t.camera_id) INTO cams FROM public.resolve_schedule_cameras(
        sched.user_id, sched.scope, sched.camera_id, sched.group_id
      ) AS t(camera_id);
      IF cams IS NULL OR array_length(cams, 1) IS NULL THEN
        run_status := 'skipped';
      ELSE
        -- `armed_by_email` vai NULL em acao automatica: o gatilho
        -- validate_armed_by_email exige que o valor, quando presente, seja o
        -- e-mail do usuario autenticado, e o cron nao tem esse contexto. Gravar
        -- 'schedule:<id>' aqui reprovava depois o DESARME MANUAL (o front
        -- atualizava o estado mantendo o campo) e a camera ficava armada. A
        -- origem do agendamento ja fica registrada em camera_schedule_runs
        -- (schedule_id) e em camera_schedules.last_run_at/last_status.
        INSERT INTO public.arm_disarm_states (user_id, camera_id, state, armed_at, armed_by_email, updated_at)
        SELECT sched.user_id, c, CASE WHEN sched.action='arm' THEN 'armed' ELSE 'disarmed' END,
               CASE WHEN sched.action='arm' THEN now() ELSE NULL END,
               NULL,
               now()
        FROM unnest(cams) c
        ON CONFLICT (camera_id) DO UPDATE
          SET state = EXCLUDED.state,
              armed_at = EXCLUDED.armed_at,
              armed_by_email = EXCLUDED.armed_by_email,
              updated_at = now();
        affected := array_length(cams, 1);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      run_status := 'error'; run_error := SQLERRM;
    END;

    INSERT INTO public.camera_schedule_runs (schedule_id, user_id, status, affected_cameras, error)
    VALUES (sched.id, sched.user_id, run_status, affected, run_error);

    UPDATE public.camera_schedules
      SET last_run_at = now(), last_status = run_status, last_error = run_error
      WHERE id = sched.id;

    total := total + 1;
  END LOOP;
  RETURN total;
END $$;

REVOKE EXECUTE ON FUNCTION public.execute_camera_schedules() FROM PUBLIC, anon, authenticated;

COMMIT;
