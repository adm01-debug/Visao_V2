#!/usr/bin/env node
/**
 * Gate de CI — Onda 124: ingestão de vídeo empurrado pela câmera (RTMP/SRT push).
 *
 * Verifica no banco real:
 *  1. Tabela `camera_ingest_endpoints` com RLS ligada e policy própria por usuário.
 *  2. Nenhum privilégio para `anon` (nem via PUBLIC).
 *  3. Unicidade da chave de publicação e do par (câmera, protocolo).
 *  4. CHECK de forma da chave em paridade literal com src/lib/ingest/streamIngest.ts.
 *  5. Rotinas de decisão (`authorize_ingest_publish`, `mark_ingest_unpublish`,
 *     `detect_stale_ingest_publishers`) são SECURITY DEFINER, com search_path fixo
 *     e executáveis apenas por service_role.
 *  6. Teste funcional em transação revertida: chave desconhecida, chave revogada,
 *     protocolo divergente e publicação válida.
 *  7. Nenhum dado vivo com chave fora de forma.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const failures = [];
const notes = [];
const query = (sql) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
const check = (label, condition, detail) => {
  if (!condition) failures.push(`${label}: ${detail}`);
};

// --- Política declarada no TypeScript ---------------------------------------
const lib = readFileSync(new URL('../src/lib/ingest/streamIngest.ts', import.meta.url), 'utf8');
const num = (name) => Number(lib.match(new RegExp(`${name}:\\s*([\\d_]+)`))?.[1]?.replace(/_/g, ''));
const policy = {
  min: num('streamKeyMinLength'),
  max: num('streamKeyMaxLength'),
  defaultStale: num('defaultStaleAfterSeconds'),
  minStale: num('minStaleAfterSeconds'),
  maxStale: num('maxStaleAfterSeconds'),
  cooldown: num('cooldownHours'),
};
check(
  'POLÍTICA',
  Object.values(policy).every((v) => Number.isFinite(v)),
  `não consegui ler as constantes de streamIngest.ts (${JSON.stringify(policy)})`,
);

// --- 1) Tabela + RLS ---------------------------------------------------------
const rlsOn = query(`
  SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname='camera_ingest_endpoints'`);
check('RLS', rlsOn === 't', 'camera_ingest_endpoints sem row level security');

const policies = query(`
  SELECT string_agg(policyname||':'||roles::text, ',' ORDER BY policyname)
    FROM pg_policies WHERE schemaname='public' AND tablename='camera_ingest_endpoints'`);
check('RLS', /camera_ingest_endpoints_user_isolation/.test(policies), `policy de isolamento ausente (${policies})`);
check('RLS', !/\banon\b|\{public\}/.test(policies), `policy exposta a anon/PUBLIC (${policies})`);

// --- 2) Privilégios ----------------------------------------------------------
const anonPriv = query(`
  SELECT count(*) FROM information_schema.role_table_grants
   WHERE table_schema='public' AND table_name='camera_ingest_endpoints'
     AND grantee IN ('anon','PUBLIC')`);
check('GRANT', anonPriv === '0', `anon/PUBLIC ainda tem ${anonPriv} privilégio(s) na tabela`);

const authPriv = query(`
  SELECT string_agg(DISTINCT privilege_type, ',' ORDER BY privilege_type)
    FROM information_schema.role_table_grants
   WHERE table_schema='public' AND table_name='camera_ingest_endpoints' AND grantee='authenticated'`);
check('GRANT', authPriv === 'DELETE,INSERT,SELECT,UPDATE', `grants de authenticated inesperados (${authPriv})`);

// --- 3) Unicidade ------------------------------------------------------------
const uniques = query(`
  SELECT string_agg(conname, ',' ORDER BY conname) FROM pg_constraint
   WHERE conrelid='public.camera_ingest_endpoints'::regclass AND contype='u'`);
check('SCHEMA', /stream_key_key/.test(uniques), `chave de publicação sem unicidade (${uniques})`);
check('SCHEMA', /camera_protocol_key/.test(uniques), `par (câmera, protocolo) sem unicidade (${uniques})`);

// --- 4) Paridade dos CHECKs --------------------------------------------------
const shapeChk = query(`
  SELECT pg_get_constraintdef(oid) FROM pg_constraint
   WHERE conrelid='public.camera_ingest_endpoints'::regclass
     AND conname='camera_ingest_endpoints_stream_key_shape'`);
check(
  'PARIDADE',
  shapeChk.includes(`[a-f0-9]{${policy.min},${policy.max}}`),
  `CHECK de forma da chave diverge do TS (${shapeChk})`,
);

const staleChk = query(`
  SELECT pg_get_constraintdef(oid) FROM pg_constraint
   WHERE conrelid='public.camera_ingest_endpoints'::regclass
     AND pg_get_constraintdef(oid) ILIKE '%stale_after_seconds%'`);
check(
  'PARIDADE',
  staleChk.includes(String(policy.minStale)) && staleChk.includes(String(policy.maxStale)),
  `limites de tolerância divergem do TS (${staleChk})`,
);

const staleDefault = query(`
  SELECT column_default FROM information_schema.columns
   WHERE table_schema='public' AND table_name='camera_ingest_endpoints'
     AND column_name='stale_after_seconds'`);
check(
  'PARIDADE',
  staleDefault.startsWith(String(policy.defaultStale)),
  `default de tolerância ${staleDefault} diverge de ${policy.defaultStale} no TS`,
);

const cooldownSrc = query(`
  SELECT prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='detect_stale_ingest_publishers'`);
check(
  'PARIDADE',
  new RegExp(`cooldown_hours\\s+constant\\s+int\\s*:=\\s*${policy.cooldown}\\b`).test(cooldownSrc),
  `janela de anti-repetição do SQL diverge de ${policy.cooldown}h do TS`,
);

// --- 5) Rotinas: definer, search_path e execução ------------------------------
for (const fn of ['authorize_ingest_publish', 'mark_ingest_unpublish', 'detect_stale_ingest_publishers']) {
  const meta = query(`
    SELECT p.prosecdef || '|' || COALESCE(array_to_string(p.proconfig, ','), '')
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname='${fn}'`);
  const [secdef, config] = meta.split('|');
  check('ROTINA', secdef === 't', `${fn} não é SECURITY DEFINER`);
  check('ROTINA', /search_path=public/.test(config), `${fn} sem SET search_path fixo (${config})`);

  const grantees = query(`
    SELECT COALESCE(string_agg(DISTINCT grantee, ',' ORDER BY grantee), '')
      FROM information_schema.routine_privileges
     WHERE routine_schema='public' AND routine_name='${fn}' AND privilege_type='EXECUTE'`);
  check('ROTINA', grantees === 'service_role', `${fn} executável por ${grantees || 'ninguém'} (esperado service_role)`);
}

// --- 6) Teste funcional em transação revertida --------------------------------
const functional = query(`
BEGIN;
  SET LOCAL role = postgres;
  CREATE TEMP TABLE _r(step text, got text) ON COMMIT DROP;

  WITH cam AS (SELECT id, user_id FROM public.cameras LIMIT 1)
  INSERT INTO public.camera_ingest_endpoints (user_id, camera_id, protocol, stream_key, status)
  SELECT cam.user_id, cam.id, 'rtmp_push', repeat('a', 48), 'pending' FROM cam;

  INSERT INTO _r
  SELECT 'unknown', public.authorize_ingest_publish(repeat('b', 48), '10.0.0.1', 'rtmp_push')->>'reason';
  INSERT INTO _r
  SELECT 'malformed', public.authorize_ingest_publish('NAO-HEX', NULL, 'rtmp_push')->>'reason';

  INSERT INTO _r
  SELECT 'mismatch', public.authorize_ingest_publish(repeat('a', 48), NULL, 'srt_push')->>'reason'
   WHERE EXISTS (SELECT 1 FROM public.camera_ingest_endpoints WHERE stream_key = repeat('a', 48));

  INSERT INTO _r
  SELECT 'allowed', public.authorize_ingest_publish(repeat('a', 48), '10.0.0.1', 'rtmp_push')->>'allowed'
   WHERE EXISTS (SELECT 1 FROM public.camera_ingest_endpoints WHERE stream_key = repeat('a', 48));

  UPDATE public.camera_ingest_endpoints SET status='revoked' WHERE stream_key = repeat('a', 48);
  INSERT INTO _r
  SELECT 'revoked', public.authorize_ingest_publish(repeat('a', 48), NULL, 'rtmp_push')->>'reason'
   WHERE EXISTS (SELECT 1 FROM public.camera_ingest_endpoints WHERE stream_key = repeat('a', 48));

  SELECT string_agg(step||'='||COALESCE(got,'null'), ';' ORDER BY step) FROM _r;
ROLLBACK;
`)
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean)
  .pop();

if (!functional || functional === 'null') {
  notes.push('TESTE FUNCIONAL pulado: nenhuma câmera cadastrada no banco de destino');
} else {
  const parsed = Object.fromEntries(functional.split(';').map((kv) => kv.split('=')));
  check('FUNCIONAL', parsed.unknown === 'unknown_key', `chave desconhecida devolveu "${parsed.unknown}"`);
  check('FUNCIONAL', parsed.malformed === 'malformed_key', `chave malformada devolveu "${parsed.malformed}"`);
  check('FUNCIONAL', parsed.mismatch === 'protocol_mismatch', `protocolo divergente devolveu "${parsed.mismatch}"`);
  check('FUNCIONAL', parsed.allowed === 'true', `publicação válida devolveu allowed="${parsed.allowed}"`);
  check('FUNCIONAL', parsed.revoked === 'revoked_key', `chave revogada devolveu "${parsed.revoked}"`);
}

// --- 7) Dados vivos -----------------------------------------------------------
const badRows = query(`
  SELECT count(*) FROM public.camera_ingest_endpoints
   WHERE stream_key !~ '^[a-f0-9]{${policy.min},${policy.max}}$'`);
check('DADOS', badRows === '0', `${badRows} endpoint(s) com chave fora de forma`);

// --- Relatório ----------------------------------------------------------------
for (const n of notes) console.log(`ℹ️  ${n}`);
if (failures.length > 0) {
  console.error('\n❌ Gate de ingestão (Onda 124) reprovado:');
  for (const f of failures) console.error(`   - ${f}`);
  process.exit(1);
}
console.log('✅ Gate de ingestão (Onda 124): tabela, privilégios, paridade SQL↔TS e decisões OK.');
