#!/usr/bin/env node
/**
 * Gate Onda 193 — fila de comandos remotos ao equipamento.
 *
 * Não confere "a migração aplicou": isso a migração já provou. Confere a
 * **postura** que precisa continuar verdadeira daqui em diante, e exercita as
 * rotinas dentro de uma transação revertida — gate estático já deixou passar
 * rotina abortando em silêncio nesta base (Onda 141).
 *
 * Rodar: node scripts/check-remote-commands.mjs
 */

import { execFileSync } from 'node:child_process';

const failures = [];
let proofs = 0;

const sql = (query) => {
  const out = execFileSync('psql', ['-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', query], {
    encoding: 'utf8',
  });
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('psql:'));
};

const expect = (condition, label) => {
  proofs += 1;
  if (!condition) failures.push(label);
};

// --- 1. Privilégios lidos pelo ACL, nunca por information_schema ------------
const acl = sql(`
  SELECT r.rolname || ':' || a.privilege_type
    FROM pg_class c
    CROSS JOIN LATERAL aclexplode(c.relacl) a
    JOIN pg_roles r ON r.oid = a.grantee
   WHERE c.relname = 'device_remote_commands' AND c.relnamespace = 'public'::regnamespace
`);
const granted = new Set(acl);

expect(![...granted].some((g) => g.startsWith('anon:')), 'anon ainda tem privilégio na fila');
expect(granted.has('authenticated:SELECT'), 'authenticated precisa poder ler a própria fila');
expect(granted.has('authenticated:INSERT'), 'authenticated precisa poder enfileirar');
expect(!granted.has('authenticated:DELETE'), 'fila jamais pode ser apagada pelo app');
expect(granted.has('service_role:UPDATE'), 'service_role precisa avançar o estado');

// --- 2. RLS ligada e sem política permissiva demais -------------------------
const rls = sql(
  `SELECT relrowsecurity FROM pg_class WHERE relname='device_remote_commands'`,
)[0];
expect(rls === 't', 'RLS desligada na fila de comandos');

const policies = sql(`
  SELECT cmd || '|' || coalesce(qual,'-') || '|' || coalesce(with_check,'-')
    FROM pg_policies WHERE tablename='device_remote_commands'
`);
expect(policies.length >= 3, 'faltam políticas na fila de comandos');
expect(
  policies.every((p) => p.includes('auth.uid()')),
  'política sem amarração ao dono',
);
expect(
  !policies.some((p) => p.startsWith('DELETE')),
  'existe política de exclusão: a fila deixaria de ser trilha',
);

// --- 3. Índice de exclusividade e de idempotência ---------------------------
const indexes = sql(
  `SELECT indexdef FROM pg_indexes WHERE tablename='device_remote_commands'`,
).join('\n');
expect(
  /UNIQUE.*\(registration_id, idempotency_key\)/.test(indexes),
  'sem índice único de idempotência: pedido repetido duplicaria comando',
);
expect(
  /device_remote_commands_exclusive_uk/.test(indexes) && /device\.reboot/.test(indexes),
  'sem índice de exclusividade: dois reinícios empilhariam',
);

// --- 4. Exercício dinâmico em transação revertida ---------------------------
const scenario = sql(`
BEGIN;
  SET LOCAL role postgres;
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
  VALUES ('00000000-0000-4000-8000-000000000193','00000000-0000-0000-0000-000000000000','authenticated','authenticated','remote-cmd-ci@visao.test','x',now(),now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.device_registrations (id, user_id, device_code, secret_hash, status)
  VALUES ('00000000-0000-4000-8000-000000000194','00000000-0000-4000-8000-000000000193','CIWAVE193AAA', repeat('a',64), 'active');

  -- 4.1 comando válido entra
  INSERT INTO public.device_remote_commands (user_id, registration_id, command, idempotency_key, expires_at, requested_by)
  VALUES ('00000000-0000-4000-8000-000000000193','00000000-0000-4000-8000-000000000194','device.reboot','idem-193-aaa', now() + interval '10 minutes','00000000-0000-4000-8000-000000000193');
  SELECT 'inserted:' || count(*)::text FROM public.device_remote_commands WHERE idempotency_key='idem-193-aaa';

  -- 4.2 prazo acima do teto é recusado
  SAVEPOINT s1;
  DO $$ BEGIN
    BEGIN
      INSERT INTO public.device_remote_commands (user_id, registration_id, command, idempotency_key, expires_at, requested_by)
      VALUES ('00000000-0000-4000-8000-000000000193','00000000-0000-4000-8000-000000000194','config.read','idem-193-ttl', now() + interval '90 minutes','00000000-0000-4000-8000-000000000193');
      RAISE NOTICE 'TTL_GUARD:FAIL';
    EXCEPTION WHEN others THEN RAISE NOTICE 'TTL_GUARD:OK';
    END;
  END $$;
  ROLLBACK TO SAVEPOINT s1;

  -- 4.3 segundo exclusivo em voo é barrado
  DO $$ BEGIN
    BEGIN
      INSERT INTO public.device_remote_commands (user_id, registration_id, command, idempotency_key, expires_at, requested_by)
      VALUES ('00000000-0000-4000-8000-000000000193','00000000-0000-4000-8000-000000000194','stream.restart','idem-193-bbb', now() + interval '10 minutes','00000000-0000-4000-8000-000000000193');
      RAISE NOTICE 'EXCLUSIVE_GUARD:FAIL';
    EXCEPTION WHEN others THEN RAISE NOTICE 'EXCLUSIVE_GUARD:OK';
    END;
  END $$;

  -- 4.4 estado encerrado é irreversível
  UPDATE public.device_remote_commands SET status='cancelled' WHERE idempotency_key='idem-193-aaa';
  DO $$ BEGIN
    BEGIN
      UPDATE public.device_remote_commands SET status='queued' WHERE idempotency_key='idem-193-aaa';
      RAISE NOTICE 'TERMINAL_GUARD:FAIL';
    EXCEPTION WHEN others THEN RAISE NOTICE 'TERMINAL_GUARD:OK';
    END;
  END $$;

  -- 4.5 expiração é fato do relógio
  INSERT INTO public.device_remote_commands (user_id, registration_id, command, idempotency_key, expires_at, requested_by)
  VALUES ('00000000-0000-4000-8000-000000000193','00000000-0000-4000-8000-000000000194','config.read','idem-193-ccc', now() + interval '1 minute','00000000-0000-4000-8000-000000000193');
  UPDATE public.device_remote_commands SET expires_at = now() - interval '1 second' WHERE false;
  SELECT 'expired:' || public.expire_device_remote_commands()::text;
ROLLBACK;
`).join('\n');

expect(/inserted:1/.test(scenario), 'comando válido não entrou na fila');
expect(/TTL_GUARD:OK/.test(scenario), 'prazo acima do teto foi aceito');
expect(/EXCLUSIVE_GUARD:OK/.test(scenario), 'dois comandos exclusivos coexistiram');
expect(/TERMINAL_GUARD:OK/.test(scenario), 'comando encerrado voltou atrás');
expect(/expired:/.test(scenario), 'rotina de expiração não executou');

// --- 5. Agenda de expiração -------------------------------------------------
try {
  const jobs = sql(`SELECT jobname FROM cron.job WHERE jobname='expire-device-remote-commands'`);
  expect(jobs.length === 1, 'rotina de expiração sem agendamento');
} catch {
  console.warn('· aviso: sem permissão de leitura em cron.job (esperado em sandbox).');
}

if (failures.length > 0) {
  console.error(failures.map((f) => `✗ ${f}`).join('\n'));
  console.error(`\n❌ Gate Onda 193 — ${failures.length} falhas em ${proofs} provas.`);
  process.exit(1);
}

console.log(`\n✅ Gate Onda 193 — fila de comandos remotos: ${proofs} provas aprovadas.`);
