-- =============================================================================
-- Guardrail do executor de agendamentos de camera
-- public.execute_camera_schedules()
--
-- Prova, de forma NAO destrutiva e sem dependencia de pgTAP, que o tick de 1
-- minuto disparado pelo pg_cron:
--   1. Agrega a lista de cameras com alias explicito (sem 42703). A versao
--      anterior levantava `column "id" does not exist` e nenhuma camera era
--      armada ou desarmada no horario programado.
--   2. Respeita a precedencia do produto: DESARME vence o ARME por camera,
--      mesmo quando o agendamento de arme foi gravado depois do de desarme.
--   3. Isola erro de fuso/expressao por agendamento: o resto da execucao
--      continua e o agendamento culpado nao derruba o job inteiro.
--   4. Nao grava historico quando o cron nao casa com o minuto.
--   5. Grava `armed_by_email` NULO em acao automatica, para o gatilho
--      validate_armed_by_email nao rejeitar o desarme manual do usuario.
--   6. Nao duplica o estado da camera (indice unico uq_arm_disarm_camera) e o
--      arme manual com ON CONFLICT (camera_id) funciona sobre registro criado
--      pelo executor.
--   7. Mantem a validacao de `armed_by_email` de gravacoes autenticadas ativa.
--
-- Executada por `scripts/check-camera-schedules-executor.mjs`
-- (comando `npm run db:check:camera-schedules`).
-- Roda inteiramente dentro de uma transacao com ROLLBACK - nao altera estado.
-- =============================================================================
BEGIN;

-- Dono das cameras de teste: cobre auth.uid() usado pelo gatilho.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"a11ce000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

DO $suite$
DECLARE
  uid_a uuid := 'a11ce000-0000-4000-8000-000000000001';
  uid_b uuid := 'a11ce000-0000-4000-8000-000000000002';
  email_a text := 'guardrail.sched.a@example.invalid';
  email_b text := 'guardrail.sched.b@example.invalid';
  cam1 uuid := 'ca000000-0000-4000-8000-000000000001';
  cam2 uuid := 'ca000000-0000-4000-8000-000000000002';
  cam3 uuid := 'ca000000-0000-4000-8000-000000000003';
  s1 uuid := '5c000000-0000-4000-8000-000000000001';
  s2 uuid := '5c000000-0000-4000-8000-000000000002';
  s3 uuid := '5c000000-0000-4000-8000-000000000003';
  s4 uuid := '5c000000-0000-4000-8000-000000000004';
  s5 uuid := '5c000000-0000-4000-8000-000000000005';
  never_cron text := '0 0 30 2 *';
  n int;
  st text;
  mail text;
  total int;
  blocked boolean;
  checks int := 0;
  failures text[] := ARRAY[]::text[];
BEGIN
  -- Usuarios de teste com e-mail conhecido (transacao termina em ROLLBACK).
  INSERT INTO auth.users (id, email) VALUES (uid_a, email_a)
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  INSERT INTO auth.users (id, email) VALUES (uid_b, email_b)
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  -- Limpeza defensiva de restos de execucoes anteriores interrompidas.
  BEGIN
    DELETE FROM public.camera_schedules WHERE user_id IN (uid_a, uid_b);
    DELETE FROM public.arm_disarm_states WHERE user_id IN (uid_a, uid_b);
    DELETE FROM public.monitor_group_cameras WHERE user_id IN (uid_a, uid_b);
    DELETE FROM public.cameras WHERE user_id IN (uid_a, uid_b);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  INSERT INTO public.cameras (id, user_id, name, location) VALUES
    (cam1, uid_a, 'Guardrail Sched 1', 'Portao'),
    (cam2, uid_a, 'Guardrail Sched 2', 'Patio'),
    (cam3, uid_a, 'Guardrail Sched 3', 'Docas');

  -- S1 DESARME da cam1 e gravado ANTES de S2 (que arma todas): sem ORDER BY a
  -- varredura fisica executaria S1 e depois S2, e a camera terminaria armada.
  INSERT INTO public.camera_schedules
    (id, user_id, name, scope, camera_id, action, cron_expression, timezone, enabled, created_at, updated_at)
  VALUES
    (s1, uid_a, 'Guardrail S1 desarme', 'camera', cam1, 'disarm', '* * * * *', 'America/Sao_Paulo', true, now() - interval '3 minutes', now() - interval '3 minutes'),
    (s2, uid_a, 'Guardrail S2 arme', 'all', NULL, 'arm', '* * * * *', 'America/Sao_Paulo', true, now() - interval '2 minutes', now() - interval '2 minutes'),
    (s3, uid_a, 'Guardrail S3 fuso invalido', 'camera', cam2, 'arm', '* * * * *', 'Fuso/Inexistente', true, now() - interval '1 minute', now() - interval '1 minute'),
    (s4, uid_a, 'Guardrail S4 nunca casa', 'camera', cam3, 'arm', never_cron, 'America/Sao_Paulo', true, now(), now()),
    (s5, uid_b, 'Guardrail S5 sem cameras', 'all', NULL, 'arm', '* * * * *', 'America/Sao_Paulo', true, now(), now());

  ---------------------------------------------------------------------------
  -- Rodada 1
  ---------------------------------------------------------------------------
  total := public.execute_camera_schedules();

  checks := checks + 1;
  IF total < 4 THEN
    failures := failures || format('executor processou %s agendamentos (esperado >= 4)', total);
  END IF;

  -- 1: nada de 42703 e nenhum erro nos agendamentos validos
  SELECT count(*) INTO n
  FROM public.camera_schedule_runs r
  WHERE r.schedule_id IN (s1, s2)
    AND (r.status <> 'ok' OR coalesce(r.error, '') <> '');
  checks := checks + 1;
  IF n <> 0 THEN failures := failures || format('runs com erro nos agendamentos validos = %s (esperado 0)', n); END IF;

  -- 2: precedencia — desarme da cam1 vence o arme de S2
  SELECT a.state INTO st FROM public.arm_disarm_states a WHERE a.camera_id = cam1;
  checks := checks + 1;
  IF st IS DISTINCT FROM 'disarmed' THEN failures := failures || format('cam1 = %s (esperado disarmed: desarme tem precedencia)', coalesce(st, 'sem registro')); END IF;

  -- cam2 e cam3 armadas por S2 (escopo all)
  SELECT a.state INTO st FROM public.arm_disarm_states a WHERE a.camera_id = cam2;
  checks := checks + 1;
  IF st IS DISTINCT FROM 'armed' THEN failures := failures || format('cam2 = %s (esperado armed)', coalesce(st, 'sem registro')); END IF;

  SELECT a.state INTO st FROM public.arm_disarm_states a WHERE a.camera_id = cam3;
  checks := checks + 1;
  IF st IS DISTINCT FROM 'armed' THEN failures := failures || format('cam3 = %s (esperado armed)', coalesce(st, 'sem registro')); END IF;

  SELECT a.affected_cameras INTO n FROM public.camera_schedule_runs a WHERE a.schedule_id = s2;
  checks := checks + 1;
  IF n <> 3 THEN failures := failures || format('S2 afetou %s cameras (esperado 3)', n); END IF;

  -- 3: fuso invalido fica restrito ao agendamento culpado
  SELECT s.last_status, s.last_error INTO st, mail FROM public.camera_schedules s WHERE s.id = s3;
  checks := checks + 1;
  IF st IS DISTINCT FROM 'error' THEN failures := failures || format('S3 last_status = %s (esperado error)', coalesce(st, 'null')); END IF;
  checks := checks + 1;
  IF coalesce(mail, '') = '' THEN failures := failures || 'S3 nao registrou last_error'; END IF;

  SELECT count(*) INTO n FROM public.camera_schedule_runs r WHERE r.schedule_id = s3 AND r.status = 'error';
  checks := checks + 1;
  IF n <> 1 THEN failures := failures || format('S3 runs de erro = %s (esperado 1)', n); END IF;

  -- 4: cron que nao casa nao gera historico
  SELECT count(*) INTO n FROM public.camera_schedule_runs r WHERE r.schedule_id = s4;
  checks := checks + 1;
  IF n <> 0 THEN failures := failures || format('S4 gerou %s runs (esperado 0: cron nao casa)', n); END IF;

  -- 5: usuario sem cameras cai em skipped
  SELECT r.status INTO st FROM public.camera_schedule_runs r WHERE r.schedule_id = s5;
  checks := checks + 1;
  IF st IS DISTINCT FROM 'skipped' THEN failures := failures || format('S5 status = %s (esperado skipped)', coalesce(st, 'sem run')); END IF;

  -- 6: acao automatica nao grava e-mail de arme
  SELECT count(*) INTO n FROM public.arm_disarm_states a
  WHERE a.camera_id IN (cam1, cam2, cam3) AND a.armed_by_email IS NOT NULL;
  checks := checks + 1;
  IF n <> 0 THEN failures := failures || format('%s registros com armed_by_email preenchido pelo cron (esperado 0)', n); END IF;

  ---------------------------------------------------------------------------
  -- Desarme manual do usuario depois do arme automatico (bug do gap)
  ---------------------------------------------------------------------------
  UPDATE public.arm_disarm_states a
     SET state = 'disarmed', updated_at = now()
   WHERE a.user_id = uid_a AND a.camera_id = cam3;
  GET DIAGNOSTICS n = ROW_COUNT;
  checks := checks + 1;
  IF n <> 1 THEN failures := failures || format('desarme manual atualizou %s linhas (esperado 1)', n); END IF;
  SELECT a.state INTO st FROM public.arm_disarm_states a WHERE a.camera_id = cam3;
  checks := checks + 1;
  IF st IS DISTINCT FROM 'disarmed' THEN failures := failures || format('cam3 apos desarme manual = %s (esperado disarmed)', coalesce(st, 'sem registro')); END IF;

  ---------------------------------------------------------------------------
  -- Arme manual sobre registro criado pelo executor (ON CONFLICT camera_id)
  ---------------------------------------------------------------------------
  INSERT INTO public.arm_disarm_states (user_id, camera_id, state, armed_by_email, armed_at, updated_at)
  VALUES (uid_a, cam3, 'armed', email_a, now(), now())
  ON CONFLICT (camera_id) DO UPDATE
    SET state = EXCLUDED.state,
        armed_by_email = EXCLUDED.armed_by_email,
        armed_at = EXCLUDED.armed_at,
        updated_at = now();

  SELECT count(*) INTO n FROM public.arm_disarm_states a WHERE a.camera_id = cam3;
  checks := checks + 1;
  IF n <> 1 THEN failures := failures || format('cam3 tem %s registros de estado (esperado 1)', n); END IF;
  SELECT a.state INTO st FROM public.arm_disarm_states a WHERE a.camera_id = cam3;
  checks := checks + 1;
  IF st IS DISTINCT FROM 'armed' THEN failures := failures || format('cam3 apos rearme manual = %s (esperado armed)', coalesce(st, 'sem registro')); END IF;

  -- O upsert antigo (sem onConflict) violaria o indice unico: prova que o alvo
  -- do conflito e obrigatorio.
  blocked := false;
  BEGIN
    INSERT INTO public.arm_disarm_states (user_id, camera_id, state) VALUES (uid_a, cam3, 'armed');
  EXCEPTION WHEN unique_violation THEN
    blocked := true;
  END;
  checks := checks + 1;
  IF NOT blocked THEN failures := failures || 'insert sem ON CONFLICT nao violou uq_arm_disarm_camera'; END IF;

  -- O gatilho continua ativo para gravacao autenticada com e-mail alheio.
  blocked := false;
  BEGIN
    UPDATE public.arm_disarm_states a
       SET armed_by_email = 'schedule:' || s1::text
     WHERE a.camera_id = cam3;
  EXCEPTION WHEN OTHERS THEN
    blocked := true;
  END;
  checks := checks + 1;
  IF NOT blocked THEN failures := failures || 'validate_armed_by_email nao bloqueou armed_by_email de terceiro'; END IF;

  ---------------------------------------------------------------------------
  -- Rodada 2: erro de fuso nao se repete no historico
  ---------------------------------------------------------------------------
  PERFORM public.execute_camera_schedules();

  SELECT count(*) INTO n FROM public.camera_schedule_runs r WHERE r.schedule_id = s3 AND r.status = 'error';
  checks := checks + 1;
  IF n <> 1 THEN failures := failures || format('S3 runs de erro apos 2 rodadas = %s (esperado 1)', n); END IF;

  SELECT count(*) INTO n FROM public.camera_schedule_runs r WHERE r.schedule_id = s4;
  checks := checks + 1;
  IF n <> 0 THEN failures := failures || format('S4 runs apos 2 rodadas = %s (esperado 0)', n); END IF;

  IF array_length(failures, 1) > 0 THEN
    RAISE EXCEPTION 'Suite execute_camera_schedules reprovada (% falhas em % checagens): %',
      array_length(failures, 1), checks, array_to_string(failures, ' | ');
  END IF;

  RAISE NOTICE 'OK: % checagens do execute_camera_schedules', checks;
END;
$suite$;

-- Executor sem JWT, como o pg_cron roda: nao ha request.jwt.claims, entao
-- auth.uid() e nulo. A cam4 pertence ao uid_b, cujo agendamento `all` (S5) a
-- arma; sob RLS quem grava e o proprio dono, entao o upsert precisa gravar
-- `user_id = uid_b` (dono do agendamento e da camera), nunca nulo.
DO $sem_jwt$
DECLARE
  cam4 uuid := 'ca000000-0000-4000-8000-000000000004';
  dono uuid;
  st text;
  n int;
BEGIN
  PERFORM set_config('request.jwt.claims', '{}', true);
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'auth.uid() deveria ser nulo fora de uma requisicao autenticada';
  END IF;

  INSERT INTO public.cameras (id, user_id, name, location)
  VALUES (cam4, 'a11ce000-0000-4000-8000-000000000002', 'Guardrail Sched 4', 'Rampa');

  PERFORM public.execute_camera_schedules();

  SELECT a.user_id, a.state INTO dono, st
    FROM public.arm_disarm_states a WHERE a.camera_id = cam4;
  IF st IS DISTINCT FROM 'armed' THEN
    RAISE EXCEPTION 'cam4 sem JWT = % (esperado armed)', coalesce(st, 'sem registro');
  END IF;
  IF dono IS DISTINCT FROM 'a11ce000-0000-4000-8000-000000000002'::uuid THEN
    RAISE EXCEPTION 'cam4 gravou user_id % (esperado uid_b, dono do agendamento e da camera)', dono;
  END IF;

  SELECT count(*) INTO n FROM public.arm_disarm_states a
   WHERE a.user_id IS NULL;
  IF n <> 0 THEN
    RAISE EXCEPTION '% registros de arm_disarm_states com user_id nulo apos rodar sem JWT', n;
  END IF;

  DELETE FROM public.arm_disarm_states WHERE camera_id = cam4;
  DELETE FROM public.cameras WHERE id = cam4;

  RAISE NOTICE 'OK: executor roda sem JWT (contexto do pg_cron) sem gravar user_id nulo';
END;
$sem_jwt$;

-- Desarme pelo usuario autenticado (RLS + gatilho), como o front faz: mantem
-- `armed_by_email` e so troca o estado. cam2 foi armada pelo cron na rodada 2.
-- O bloco anterior anulou os claims para simular o pg_cron; aqui o usuario
-- logado volta a ser uid_a, senao auth.uid() fica nulo e a policy de UPDATE
-- barra tudo.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"a11ce000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $rls$
DECLARE
  n int;
  st text;
BEGIN
  UPDATE public.arm_disarm_states a
     SET state = 'disarmed', updated_at = now()
   WHERE a.camera_id = 'ca000000-0000-4000-8000-000000000002';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN
    RAISE EXCEPTION 'desarme via RLS atualizou % linhas (esperado 1)', n;
  END IF;

  SELECT a.state INTO st FROM public.arm_disarm_states a
   WHERE a.camera_id = 'ca000000-0000-4000-8000-000000000002';
  IF st IS DISTINCT FROM 'disarmed' THEN
    RAISE EXCEPTION 'cam2 apos desarme via RLS = % (esperado disarmed)', coalesce(st, 'null');
  END IF;

  RAISE NOTICE 'OK: desarme do usuario autenticado funcionou (RLS + gatilho)';
EXCEPTION WHEN OTHERS THEN
  -- RAISE dentro do bloco EXCEPTION WHEN OTHERS nao e propagado para o script
  -- externo: as reprovacoes deste bloco precisam ser forcadas de novo no nível
  -- de instrucao para que o psql saia com erro e o guard nao aprove em falso.
  RAISE EXCEPTION '%', SQLERRM;
END;
$rls$;

-- Rearme manual do usuario, com o mesmo upsert e os mesmos campos de
-- src/hooks/useArmDisarm.ts:51-61, agora sob RLS. cam1 foi desarmada pelo cron
-- (armed_by_email nulo); o upsert do front precisa substituir o registro.
DO $rls_arme$
DECLARE
  n int;
  st text;
  dono uuid;
BEGIN
  INSERT INTO public.arm_disarm_states (user_id, camera_id, state, armed_by_email, armed_at, disarm_at)
  VALUES (
    'a11ce000-0000-4000-8000-000000000001',
    'ca000000-0000-4000-8000-000000000001',
    'armed',
    'guardrail.sched.a@example.invalid',
    now(),
    NULL
  )
  ON CONFLICT (camera_id) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        state = EXCLUDED.state,
        armed_by_email = EXCLUDED.armed_by_email,
        armed_at = EXCLUDED.armed_at,
        disarm_at = EXCLUDED.disarm_at;

  SELECT a.state, a.user_id INTO st, dono
    FROM public.arm_disarm_states a
   WHERE a.camera_id = 'ca000000-0000-4000-8000-000000000001';
  IF st IS DISTINCT FROM 'armed' THEN
    RAISE EXCEPTION 'cam1 apos rearme via RLS = % (esperado armed)', coalesce(st, 'sem registro');
  END IF;
  IF dono IS DISTINCT FROM 'a11ce000-0000-4000-8000-000000000001'::uuid THEN
    RAISE EXCEPTION 'cam1 apos rearme gravou user_id % (esperado uid_a)', dono;
  END IF;

  -- A RLS continua barrando gravacao em nome de outro usuario: o WITH CHECK da
  -- policy de INSERT usa auth.uid() = user_id.
  BEGIN
    INSERT INTO public.arm_disarm_states (user_id, camera_id, state)
    VALUES ('a11ce000-0000-4000-8000-000000000002', 'ca000000-0000-4000-8000-000000000004', 'armed');
    RAISE EXCEPTION 'RLS permitiu inserir arm_disarm_states em nome de outro usuario';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  SELECT count(*) INTO n FROM public.arm_disarm_states
   WHERE camera_id IN ('ca000000-0000-4000-8000-000000000001');
  IF n <> 1 THEN
    RAISE EXCEPTION 'cam1 tem % registros de estado apos o rearme (esperado 1)', n;
  END IF;

  RAISE NOTICE 'OK: rearme manual via RLS (mesmo upsert do useArmDisarm)';
END;
$rls_arme$;

-- O executor e SECURITY DEFINER e nao pode ser chamado por authenticated/anon.
SET LOCAL ROLE anon;

DO $revoke$
BEGIN
  BEGIN
    PERFORM public.execute_camera_schedules();
    RAISE EXCEPTION 'anon conseguiu executar execute_camera_schedules';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$revoke$;

ROLLBACK;
