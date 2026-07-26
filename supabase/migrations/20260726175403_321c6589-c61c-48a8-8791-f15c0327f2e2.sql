-- ============================================================================
-- Onda 119 — verificação funcional. Não altera estrutura nem dados reais:
-- cria linhas sintéticas, exercita as rotinas e apaga tudo ao final.
-- Qualquer asserção falha aborta a transação inteira.
-- ============================================================================
DO $verify$
DECLARE
  ag uuid; usr uuid := gen_random_uuid();
  t1 uuid; t2 uuid; t3 uuid; t4 uuid;
  w1 interval; w2 interval; e3 text; e4 text;
BEGIN
  -- O projeto ainda não tem usuários reais; a FK para auth.users é removida
  -- apenas durante esta verificação e recriada idêntica logo em seguida.
  -- (Desligar gatilhos de integridade não é permitido nem para o dono.)
  ALTER TABLE public.local_agents DROP CONSTRAINT local_agents_user_id_fkey;

  -- 'revoked' garante que a rotina de cura (que só olha 'active') jamais
  -- enxergue este agente sintético durante a verificação.
  INSERT INTO public.local_agents (user_id, name, status, token_hash)
    VALUES (usr, 'w119-verificacao', 'revoked', encode(gen_random_bytes(16), 'hex'))
    RETURNING id INTO ag;

  -- C1: tarefa jitterada com TTL curto precisa ganhar janela mínima.
  INSERT INTO public.agent_relay_tasks (agent_id, user_id, kind, request, scheduled_at, expires_at)
    VALUES (ag, usr, 'http_request', '{}'::jsonb, now() + interval '540 seconds', now() + interval '30 seconds')
    RETURNING id INTO t1;
  SELECT expires_at - scheduled_at INTO w1 FROM public.agent_relay_tasks WHERE id = t1;
  IF w1 < interval '60 seconds' THEN
    RAISE EXCEPTION 'C1 falhou: janela de % após normalização', w1;
  END IF;

  -- C2: TTL absurdo é truncado no teto de sanidade.
  INSERT INTO public.agent_relay_tasks (agent_id, user_id, kind, request, expires_at)
    VALUES (ag, usr, 'http_request', '{}'::jsonb, now() + interval '10 days')
    RETURNING id INTO t2;
  SELECT expires_at - scheduled_at INTO w2 FROM public.agent_relay_tasks WHERE id = t2;
  IF w2 > interval '3600 seconds' THEN
    RAISE EXCEPTION 'C2 falhou: janela de % acima do teto', w2;
  END IF;

  -- C3/C4: classificação da expiração com janela justa.
  ALTER TABLE public.agent_relay_tasks DISABLE TRIGGER trg_normalize_agent_relay_task_window;
  INSERT INTO public.agent_relay_tasks (agent_id, user_id, kind, request, scheduled_at, expires_at)
    VALUES (ag, usr, 'http_request', '{}'::jsonb, now() - interval '600 seconds', now() - interval '10 seconds')
    RETURNING id INTO t3;
  INSERT INTO public.agent_relay_tasks
    (agent_id, user_id, kind, request, scheduled_at, expires_at, claimed_at, status)
    VALUES (ag, usr, 'http_request', '{}'::jsonb, now() - interval '600 seconds',
            now() - interval '10 seconds', now() - interval '300 seconds', 'in_progress')
    RETURNING id INTO t4;
  ALTER TABLE public.agent_relay_tasks ENABLE TRIGGER trg_normalize_agent_relay_task_window;

  PERFORM public.expire_agent_relay_tasks();
  SELECT error INTO e3 FROM public.agent_relay_tasks WHERE id = t3;
  SELECT error INTO e4 FROM public.agent_relay_tasks WHERE id = t4;
  IF e3 IS DISTINCT FROM 'task_expired_unclaimed' THEN
    RAISE EXCEPTION 'C3 falhou: motivo % (esperado task_expired_unclaimed)', e3;
  END IF;
  IF e4 IS DISTINCT FROM 'task_expired_no_response' THEN
    RAISE EXCEPTION 'C4 falhou: motivo % (esperado task_expired_no_response)', e4;
  END IF;

  -- C5: a CHECK barra janela invertida mesmo sem o trigger.
  BEGIN
    ALTER TABLE public.agent_relay_tasks DISABLE TRIGGER trg_normalize_agent_relay_task_window;
    INSERT INTO public.agent_relay_tasks (agent_id, user_id, kind, request, scheduled_at, expires_at)
      VALUES (ag, usr, 'http_request', '{}'::jsonb, now() + interval '100 seconds', now());
    RAISE EXCEPTION 'C5 falhou: janela invertida foi aceita';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;
  ALTER TABLE public.agent_relay_tasks ENABLE TRIGGER trg_normalize_agent_relay_task_window;

  -- Limpeza: as tarefas somem em cascata junto com o agente sintético.
  DELETE FROM public.local_agents WHERE id = ag;
  ALTER TABLE public.local_agents
    ADD CONSTRAINT local_agents_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

  RAISE NOTICE 'Onda 119 verificada: C1 janela=%, C2 janela=%, C3=%, C4=%, C5 ok', w1, w2, e3, e4;
END;
$verify$;
