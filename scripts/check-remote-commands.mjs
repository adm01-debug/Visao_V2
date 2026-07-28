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

// --- 4. Exercício dinâmico via autoteste do banco --------------------------
// Gate estático não prova execução (Onda 141). O autoteste roda dentro do
// banco, com o papel dono da tabela, e desfaz tudo o que criou.
const selftest = JSON.parse(sql(`SELECT public.device_remote_command_selftest()::text`)[0]);

expect(selftest.admitted === true, 'comando válido não entrou na fila');
expect(selftest.ttl_guard === true, 'prazo acima do teto foi aceito');
expect(selftest.exclusive_guard === true, 'dois comandos exclusivos coexistiram');
expect(selftest.idempotency_guard === true, 'chave repetida duplicou o comando');
expect(selftest.ownership_guard === true, 'comando aceito para registro de outro dono');
expect(selftest.terminal_guard === true, 'comando encerrado voltou atrás');
expect(selftest.expired === true, 'comando vencido continuou na fila');

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
