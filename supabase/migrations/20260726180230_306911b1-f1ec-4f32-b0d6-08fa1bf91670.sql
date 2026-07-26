-- ============================================================================
-- Onda 120 — Justiça do veredito de surdez (espelha src/lib/relayVerdict.ts).
--
-- Reescrita cirúrgica de public.heal_local_agents(): trocamos apenas o bloco
-- de contagem de evidências e as duas mensagens derivadas dele. O restante da
-- rotina (disjuntor, orçamento e jitter da Onda 118) é preservado byte a byte,
-- porque reescrever a função inteira arriscaria perder ajustes anteriores.
--
-- Defeitos corrigidos:
--   D1  tarefa abandonada pelo backend (25s) tinha janela esticada para 60s
--       pela Onda 119 e passava a acusar o agente. Agora é descartada.
--   D2  `failed` (o agente respondeu com o erro do alvo) contava como surdez.
--       Agora é prova de vida e vai ao denominador.
--   D3  o motivo do abandono do backend não era distinguível do silêncio.
-- ============================================================================
DO $migrate$
DECLARE
  src  text;
  novo text;

  bloco_antigo constant text :=
$old$      SELECT count(*) FILTER (WHERE r.status = 'done')                       AS done,
             count(*) FILTER (WHERE r.status = 'failed')                     AS failed,$old$;

  bloco_novo constant text :=
$new$      -- Onda 120: `done` e `failed` sao ambos PROVA DE VIDA. Uma tarefa que
      -- voltou com erro do alvo (camera 401, host inalcancavel) demonstra que o
      -- agente ouviu, executou e respondeu. Acusa-lo disso troca um problema de
      -- camera por uma frota reiniciando em cascata.
      SELECT count(*) FILTER (WHERE r.status IN ('done', 'failed')
                                AND COALESCE(r.error, '') NOT IN ('backend_timeout', 'relay_backend_abandoned')) AS done,
             0                                                               AS failed,$new$;

  filtro_antigo constant text :=
$old$             count(*) FILTER (WHERE (r.status = 'expired'
                                     OR (r.status = 'pending' AND r.expires_at < now()))
                                AND (r.expires_at - r.scheduled_at) >= interval '60 seconds'
                                AND COALESCE(r.error, '') <> 'task_expired_unfair_window') AS expired$old$;

  filtro_novo constant text :=
$new$             -- Onda 120: so e surdez o silencio com janela justa que NAO tenha
             -- sido encerrado por decisao nossa. 'backend_timeout' e a Edge
             -- Function desistindo aos 25s — a tarefa ate tinha 60s de janela
             -- (esticada pela Onda 119), mas nunca chegou a ser oferecida pelo
             -- prazo inteiro. Culpar o agente por isso e reinicio indevido.
             count(*) FILTER (WHERE (r.status = 'expired'
                                     OR (r.status = 'pending' AND r.expires_at < now()))
                                AND (r.expires_at - r.scheduled_at) >= interval '60 seconds'
                                AND COALESCE(r.error, '') NOT IN ('task_expired_unfair_window',
                                                                  'backend_timeout',
                                                                  'relay_backend_abandoned')) AS expired$new$;

  msg_crit_antiga constant text :=
    $old$'%s%% das tarefas de relay expiraram/falharam com heartbeat ativo'$old$;
  msg_crit_nova constant text :=
    $new$'%s%% das tarefas de relay com janela justa ficaram sem resposta do agente'$new$;

  msg_warn_antiga constant text := $old$'%s%% das tarefas de relay não completaram'$old$;
  msg_warn_nova   constant text := $new$'%s%% das tarefas de relay ficaram sem resposta do agente'$new$;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO src
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'heal_local_agents';

  IF src IS NULL THEN
    RAISE EXCEPTION 'heal_local_agents nao encontrada — abortando para nao criar versao divergente';
  END IF;

  novo := src;
  novo := replace(novo, bloco_antigo,    bloco_novo);
  novo := replace(novo, filtro_antigo,   filtro_novo);
  novo := replace(novo, msg_crit_antiga, msg_crit_nova);
  novo := replace(novo, msg_warn_antiga, msg_warn_nova);

  -- Cada substituicao e obrigatoria: se o texto-alvo mudou, preferimos abortar
  -- a instalar uma funcao meio corrigida.
  IF novo = src THEN
    RAISE EXCEPTION 'nenhuma substituicao aplicada — corpo de heal_local_agents divergiu do esperado';
  END IF;
  IF position(bloco_novo    in novo) = 0 THEN RAISE EXCEPTION 'falhou: bloco de prova de vida'; END IF;
  IF position(filtro_novo   in novo) = 0 THEN RAISE EXCEPTION 'falhou: filtro de surdez'; END IF;
  IF position(msg_crit_nova in novo) = 0 THEN RAISE EXCEPTION 'falhou: mensagem critica'; END IF;
  IF position(msg_warn_nova in novo) = 0 THEN RAISE EXCEPTION 'falhou: mensagem de aviso'; END IF;

  -- Salvaguardas: nada da Onda 118 pode ter se perdido no caminho.
  IF position('stable_hash32'    in novo) = 0 THEN RAISE EXCEPTION 'regressao: jitter deterministico sumiu'; END IF;
  IF position('scheduled_at'     in novo) = 0 THEN RAISE EXCEPTION 'regressao: agendamento sumiu'; END IF;
  IF position('SECURITY DEFINER' in novo) = 0 THEN RAISE EXCEPTION 'regressao: blindagem sumiu'; END IF;

  EXECUTE novo;
END;
$migrate$;

COMMENT ON FUNCTION public.heal_local_agents() IS
  'Onda 115/118/120 — cura de agentes locais. Evidencia de surdez = silencio com janela justa (>= 60s) nao encerrado pelo backend. Respostas do agente, inclusive com erro do alvo, sao prova de vida. Espelha src/lib/relayVerdict.ts.';
