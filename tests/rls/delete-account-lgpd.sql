-- Guardrail da exclusao de conta (LGPD) - public.delete_user_data.
--
-- Reproduz o caminho real da Edge Function `delete-my-account`: cliente
-- privilegiado (service_role, sem JWT de titular) chamando a RPC. Cobre as
-- lacunas que a revisao apontou:
--   * auditoria gravada com identidade do alvo (o bug que abortava tudo);
--   * `face_recognition_configs` apagado por `user_id`;
--   * trilha de silenciamentos PRESERVADA e anonimizada (nao apagada);
--   * `DELETE FROM auth.users` liberado (nenhuma FK RESTRICT sobrevive), que e
--     exatamente o que `auth.admin.deleteUser` faz em seguida;
--   * RPC fechada para `anon`/`authenticated`.
--
-- Roda em transacao com ROLLBACK: nao deixa usuario nem dado de teste.
-- Uso: npm run db:check:delete-account  (precisa de SUPABASE_DB_URL)
BEGIN;

INSERT INTO auth.users (id, email, encrypted_password, created_at, updated_at)
VALUES ('e0000000-0000-4000-8000-000000000001', 'guardrail-lgpd@example.invalid', '', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.audit_logs (user_id, action, entity_type)
VALUES ('e0000000-0000-4000-8000-000000000001', 'seed.guardrail', 'user');

INSERT INTO public.cameras (id, user_id, name, location, status)
VALUES ('c0000000-0000-4000-8000-000000000009', 'e0000000-0000-4000-8000-000000000001', 'Cam Guardrail', 'Portaria', 'offline');

INSERT INTO public.face_recognition_configs (user_id, enabled)
VALUES ('e0000000-0000-4000-8000-000000000001', true);

INSERT INTO public.notification_configs (user_id, name, enabled)
VALUES ('e0000000-0000-4000-8000-000000000001', 'Config Guardrail', true);

INSERT INTO public.alertmanager_silences_audit
  (action, actor_user_id, actor_email, ip_address, user_agent, matchers,
   duration_minutes, comment, justification, status)
VALUES ('create', 'e0000000-0000-4000-8000-000000000001',
        'guardrail-lgpd@example.invalid', '203.0.113.9', 'guardrail-agent/1.0',
        '{"alertname":"x"}', 15, 'silenciado pelo titular',
        'manutencao programada do titular', 'ok');

-- Caminho privilegiado: a Edge Function chama a RPC com a service role, sem o
-- JWT do titular. `auth.uid()` e NULL aqui.
SET LOCAL ROLE service_role;
SELECT public.delete_user_data('e0000000-0000-4000-8000-000000000001');
RESET ROLE;

DO $$
DECLARE
  uid uuid := 'e0000000-0000-4000-8000-000000000001';
  n int;
  linha record;
BEGIN
  SELECT count(*) INTO n FROM public.audit_logs
   WHERE entity_id = uid AND action = 'user.delete_request'
     AND user_id = uid AND details->>'privileged_path' = 'true';
  IF n <> 1 THEN
    RAISE EXCEPTION 'FALHA auditoria da exclusao privilegiada: linhas=% (esperado 1)', n;
  END IF;

  SELECT count(*) INTO n FROM public.cameras WHERE user_id = uid;
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA sobrou camera do titular: %', n; END IF;

  SELECT count(*) INTO n FROM public.face_recognition_configs WHERE user_id = uid;
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA sobrou preferencia de reconhecimento facial: %', n; END IF;

  SELECT count(*) INTO n FROM public.notification_configs WHERE user_id = uid;
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA sobrou configuracao de notificacao: %', n; END IF;

  SELECT count(*) INTO n FROM public.audit_logs WHERE user_id = uid AND action = 'seed.guardrail';
  IF n <> 1 THEN RAISE EXCEPTION 'FALHA trilha de auditoria comum foi apagada: %', n; END IF;

  SELECT actor_user_id, actor_email, ip_address, user_agent, comment, justification
    INTO linha
    FROM public.alertmanager_silences_audit WHERE matchers = '{"alertname":"x"}'::jsonb;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FALHA trilha de silenciamento foi apagada (evidencia de seguranca perdida)';
  END IF;
  IF linha.actor_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'FALHA trilha de silenciamento manteve o vinculo com o titular: %', linha.actor_user_id;
  END IF;
  IF linha.actor_email IS NOT NULL THEN
    RAISE EXCEPTION 'FALHA email do titular permaneceu na trilha: %', linha.actor_email;
  END IF;
  IF linha.ip_address IS NOT NULL THEN
    RAISE EXCEPTION 'FALHA IP do titular permaneceu na trilha: %', linha.ip_address;
  END IF;
  IF linha.user_agent IS NOT NULL THEN
    RAISE EXCEPTION 'FALHA user_agent do titular permaneceu na trilha: %', linha.user_agent;
  END IF;
  IF linha.comment IS NOT NULL THEN
    RAISE EXCEPTION 'FALHA comentario livre do silenciamento permaneceu: %', linha.comment;
  END IF;
  IF linha.justification IS NOT NULL THEN
    RAISE EXCEPTION 'FALHA justificativa livre do silenciamento permaneceu: %', linha.justification;
  END IF;

  RAISE NOTICE 'PASS 1..7: auditoria privilegiada, expurgo LGPD e trilha anonimizada';
END $$;

-- O passo seguinte da Edge Function e `auth.admin.deleteUser`. Nenhuma FK pode
-- bloquea-lo depois de os dados ja terem sido apagados.
DELETE FROM auth.users WHERE id = 'e0000000-0000-4000-8000-000000000001';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = 'e0000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'FALHA conta de autenticacao nao foi removida';
  END IF;
  RAISE NOTICE 'PASS 8: auth.users removido sem bloqueio de FK (equivalente a auth.admin.deleteUser)';
END $$;

ROLLBACK;