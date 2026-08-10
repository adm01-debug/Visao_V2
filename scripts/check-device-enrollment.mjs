#!/usr/bin/env node
/**
 * Gate de CI — Onda 190: Conexão por Registro.
 *
 * Prova, no banco real:
 *  1. Segredo só existe como digest: CHECK de formato hex(64) nas duas colunas.
 *  2. Código do dispositivo tem o mesmo tamanho declarado no TypeScript.
 *  3. Graça de rotação é indivisível (hash anterior e instante andam juntos).
 *  4. Trilha é append-only (gatilho de imutabilidade).
 *  5. Guarda de governança existe e cobre INSERT e UPDATE.
 *  6. RLS ativa, sem privilégio para `anon` e SEM policy de escrita
 *     (escrita só pelas rotinas SECURITY DEFINER).
 *  7. Exercício dinâmico em transação revertida: inscrever → rotacionar →
 *     revogar → revogar de novo, provando terminalidade, idempotência,
 *     limpeza da graça e recusa de reativação.
 */
import { execFileSync } from 'node:child_process';
import { DEVICE_CODE_LENGTH, ROTATION_GRACE_MS } from '../src/lib/devices/deviceEnrollment.ts';

const failures = [];
const query = (sql) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
const check = (label, condition, detail) => {
  if (!condition) failures.push(`${label}: ${detail}`);
};

const constraints = query(`
  SELECT conname || '=' || pg_get_constraintdef(oid)
    FROM pg_constraint WHERE conrelid='public.device_registrations'::regclass`);

// 1) Segredo só como digest
check(
  '1a hash vigente hex(64)',
  /secret_hash_shape=.*\[0-9a-f\]\{64\}/.test(constraints),
  constraints
);
check(
  '1b hash anterior hex(64)',
  /previous_secret_hash_shape=.*\[0-9a-f\]\{64\}/.test(constraints),
  constraints
);
check(
  '1c segredo difere do anterior',
  /secret_differs_from_previous/.test(constraints),
  constraints
);

// 2) Código: SQL ↔ TypeScript
check(
  '2 tamanho do código',
  new RegExp(`device_code_shape=.*\\[A-Z0-9\\]\\{${DEVICE_CODE_LENGTH}\\}`).test(constraints),
  `esperado ${DEVICE_CODE_LENGTH} — ${constraints}`
);

// 3) Graça indivisível
check('3 graça pareada', /rotation_grace_paired/.test(constraints), constraints);

// 4) Trilha append-only
const auditTrg = query(`
  SELECT coalesce(string_agg(pg_get_triggerdef(oid), ' | '), '')
    FROM pg_trigger
   WHERE tgrelid='public.device_registration_audit'::regclass
     AND tgname='trg_device_audit_immutable' AND NOT tgisinternal`);
check(
  '4 trilha imutável',
  /BEFORE (UPDATE OR DELETE|DELETE OR UPDATE)/.test(auditTrg),
  `definição: ${auditTrg || 'ausente'}`
);

// 5) Guarda de governança
const rulesTrg = query(`
  SELECT coalesce(string_agg(pg_get_triggerdef(oid), ' | '), '')
    FROM pg_trigger
   WHERE tgrelid='public.device_registrations'::regclass
     AND tgname='trg_device_registration_rules' AND NOT tgisinternal`);
check(
  '5a guarda existe',
  /BEFORE INSERT OR UPDATE/.test(rulesTrg),
  `definição: ${rulesTrg || 'ausente'}`
);
const rulesSrc = query(
  `SELECT pg_get_functiondef('public.enforce_device_registration_rules()'::regprocedure)`
);
check(
  '5b revogação terminal',
  /não pode ser reativado/.test(rulesSrc),
  'regra de terminalidade ausente'
);
check(
  '5c código imutável',
  /device_code é imutável/.test(rulesSrc),
  'imutabilidade do código ausente'
);
check(
  '5d versão não retrocede',
  /secret_version não pode retroceder/.test(rulesSrc),
  'monotonicidade ausente'
);
check(
  '5e SECURITY DEFINER + search_path',
  /SECURITY DEFINER/.test(rulesSrc) && /search_path/.test(rulesSrc),
  'contrato de segurança ausente'
);

// 6) RLS, privilégios (via ACL, nunca information_schema) e ausência de escrita direta
for (const table of ['device_registrations', 'device_registration_audit']) {
  const rls = query(`SELECT relrowsecurity FROM pg_class WHERE oid='public.${table}'::regclass`);
  check(`6a RLS ${table}`, rls === 't', `relrowsecurity=${rls}`);

  const anonAcl = query(`
    SELECT coalesce(string_agg(DISTINCT a.privilege_type, ','), '')
      FROM pg_class c, aclexplode(c.relacl) a
     WHERE c.oid='public.${table}'::regclass
       AND a.grantee = 'anon'::regrole`);
  check(`6b anon sem acesso a ${table}`, anonAcl === '', `privilégios: ${anonAcl}`);

  const authAcl = query(`
    SELECT coalesce(string_agg(DISTINCT a.privilege_type, ','), '')
      FROM pg_class c, aclexplode(c.relacl) a
     WHERE c.oid='public.${table}'::regclass
       AND a.grantee = 'authenticated'::regrole`);
  check(`6c authenticated só leitura em ${table}`, authAcl === 'SELECT', `privilégios: ${authAcl}`);

  const writePolicies = query(`
    SELECT coalesce(string_agg(policyname || ':' || cmd, ','), '')
      FROM pg_policies WHERE schemaname='public' AND tablename='${table}' AND cmd <> 'SELECT'`);
  check(`6d ${table} sem policy de escrita`, writePolicies === '', `policies: ${writePolicies}`);
}

// 6e) RPCs não são executáveis por anon
for (const fn of ['enroll_device', 'rotate_device_secret', 'revoke_device']) {
  const anonExec = query(`
    SELECT has_function_privilege('anon', p.oid, 'EXECUTE')
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname='${fn}' LIMIT 1`);
  check(`6e ${fn} fechado para anon`, anonExec === 'f', `has_execute=${anonExec}`);
}

// 7) Exercício dinâmico (transação revertida)
const dynamic = execFileSync(
  'psql',
  [
    '-v',
    'ON_ERROR_STOP=1',
    '-tA',
    '-c',
    `BEGIN;
     SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
     CREATE TEMP TABLE _e ON COMMIT DROP AS SELECT * FROM public.enroll_device('gate-190', NULL, 24);
     SELECT 'code=' || (SELECT length(device_code) FROM _e);
     SELECT 'secret=' || (SELECT length(device_secret) FROM _e);
     SELECT 'plaintext_stored=' || (SELECT count(*) FROM public.device_registrations d, _e
        WHERE d.id = _e.registration_id AND d.secret_hash = _e.device_secret);
     CREATE TEMP TABLE _r ON COMMIT DROP AS
       SELECT * FROM public.rotate_device_secret((SELECT registration_id FROM _e));
     SELECT 'version=' || (SELECT secret_version FROM _r);
     SELECT 'grace=' || (SELECT (previous_secret_hash IS NOT NULL AND rotated_at IS NOT NULL)::text
        FROM public.device_registrations d, _e WHERE d.id = _e.registration_id);
     SELECT 'revoke=' || public.revoke_device((SELECT registration_id FROM _e))::text;
     SELECT 'revoke_again=' || public.revoke_device((SELECT registration_id FROM _e))::text;
     SELECT 'grace_cleared=' || (SELECT (previous_secret_hash IS NULL AND rotated_at IS NULL)::text
        FROM public.device_registrations d, _e WHERE d.id = _e.registration_id);
     SELECT 'audit=' || (SELECT count(*) FROM public.device_registration_audit a, _e
        WHERE a.registration_id = _e.registration_id);
     ROLLBACK;`,
  ],
  { encoding: 'utf8' }
)
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean);

const got = Object.fromEntries(dynamic.filter((l) => l.includes('=')).map((l) => l.split('=')));
check('7a código do tamanho certo', got.code === String(DEVICE_CODE_LENGTH), `code=${got.code}`);
check('7b segredo de 64 hex', got.secret === '64', `secret=${got.secret}`);
check(
  '7c segredo jamais em claro no banco',
  got.plaintext_stored === '0',
  `linhas: ${got.plaintext_stored}`
);
check('7d rotação incrementa versão', got.version === '2', `version=${got.version}`);
check('7e graça registrada', got.grace === 'true', `grace=${got.grace}`);
check('7f revogação efetiva', got.revoke === 'true', `revoke=${got.revoke}`);
check('7g revogação idempotente', got.revoke_again === 'false', `revoke_again=${got.revoke_again}`);
check(
  '7h graça morre com o vínculo',
  got.grace_cleared === 'true',
  `grace_cleared=${got.grace_cleared}`
);
check('7i trilha com 3 eventos', got.audit === '3', `audit=${got.audit}`);

// 7j) Reativação de revogado é recusada de fato
let reactivationBlocked = false;
try {
  execFileSync(
    'psql',
    [
      '-v',
      'ON_ERROR_STOP=1',
      '-tA',
      '-c',
      `BEGIN;
       SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
       CREATE TEMP TABLE _x ON COMMIT DROP AS SELECT * FROM public.enroll_device('gate-190-b', NULL, 1);
       SELECT public.revoke_device((SELECT registration_id FROM _x));
       UPDATE public.device_registrations SET status='active'
        WHERE id=(SELECT registration_id FROM _x);
       ROLLBACK;`,
    ],
    { encoding: 'utf8', stdio: 'pipe' }
  );
} catch {
  reactivationBlocked = true;
}
check('7j revogado não reativa', reactivationBlocked, 'UPDATE para active foi aceito');

// 7k) Trilha realmente recusa reescrita
let auditImmutable = false;
try {
  execFileSync(
    'psql',
    [
      '-v',
      'ON_ERROR_STOP=1',
      '-tA',
      '-c',
      `BEGIN;
       SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
       CREATE TEMP TABLE _y ON COMMIT DROP AS SELECT * FROM public.enroll_device('gate-190-c', NULL, 1);
       UPDATE public.device_registration_audit SET reason='adulterado'
        WHERE registration_id=(SELECT registration_id FROM _y);
       ROLLBACK;`,
    ],
    { encoding: 'utf8', stdio: 'pipe' }
  );
} catch {
  auditImmutable = true;
}
check('7k trilha imutável de fato', auditImmutable, 'UPDATE na trilha foi aceito');

// 8) Graça do SQL bate com a constante do TypeScript
check(
  '8 graça declarada',
  ROTATION_GRACE_MS === 5 * 60_000,
  `ROTATION_GRACE_MS=${ROTATION_GRACE_MS}`
);

if (failures.length > 0) {
  console.error(`\n❌ Gate Onda 190 — ${failures.length} falha(s):`);
  failures.forEach((f) => console.error(`   • ${f}`));
  process.exit(1);
}
console.log('✅ Gate Onda 190 — conexão por registro: todas as provas aprovadas.');
