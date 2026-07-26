#!/usr/bin/env node
/**
 * Gate de CI — Onda 126: conectores para centrais de monitoramento.
 *
 * Verifica no banco real:
 *  1. RLS ligada nas duas tabelas, policies próprias e zero privilégio para anon/PUBLIC.
 *  2. Fila é escrita só por rotina: `authenticated` tem apenas SELECT em dispatches.
 *  3. Invariantes estruturais (dedupe único, CHECKs de lease/entrega, índice de fila).
 *  4. Paridade literal entre `monitoring_center_policy()` / `contact_id_for_event()`
 *     e as constantes de src/lib/integrations/monitoringCenter.ts.
 *  5. Rotinas SECURITY DEFINER com search_path fixo e EXECUTE só para service_role.
 *  6. Bateria funcional em transação revertida: dedup, prioridade, lease, backoff,
 *     prazo final, exaustão de tentativas, idempotência e reaping.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const failures = [];
const query = (sql) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
const check = (label, condition, detail) => {
  if (!condition) failures.push(`${label}: ${detail}`);
};

// --- Constantes declaradas no TypeScript -------------------------------------
const lib = readFileSync(new URL('../src/lib/integrations/monitoringCenter.ts', import.meta.url), 'utf8');
const polBlock = lib.slice(lib.indexOf('MONITORING_CENTER_POLICY ='), lib.indexOf('CONTACT_ID_MAP ='));
const num = (name) => Number(polBlock.match(new RegExp(`${name}:\\s*([\\d_]+)`))?.[1]?.replace(/_/g, ''));
const ts = {
  maxAttempts: num('maxAttempts'),
  baseBackoffSeconds: num('baseBackoffSeconds'),
  maxBackoffSeconds: num('maxBackoffSeconds'),
  leaseSeconds: num('leaseSeconds'),
  dedupeWindowSeconds: num('dedupeWindowSeconds'),
  deadlineSeconds: num('deadlineSeconds'),
  heartbeatSeconds: num('heartbeatSeconds'),
};
check(
  'POLÍTICA',
  Object.values(ts).every((v) => Number.isFinite(v)),
  `não consegui ler MONITORING_CENTER_POLICY (${JSON.stringify(ts)})`,
);

const mapBlock = lib.slice(lib.indexOf('CONTACT_ID_MAP ='), lib.indexOf('} as const satisfies'));
const tsMap = [...mapBlock.matchAll(/^\s{2}(\w+):\s*\{\s*code:\s*'(\d{3})',\s*qualifier:\s*'([ER])',\s*priority:\s*(\d)/gm)]
  .map((m) => `${m[1]}|${m[2]}|${m[3]}|${m[4]}`);
check('MAPA', tsMap.length >= 16, `CONTACT_ID_MAP com apenas ${tsMap.length} entradas`);

// --- 1) RLS e privilégios -----------------------------------------------------
for (const table of ['monitoring_center_accounts', 'monitoring_center_dispatches']) {
  const rls = query(`SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relname='${table}'`);
  check('RLS', rls === 't', `${table} sem row level security`);

  const policies = query(`SELECT COALESCE(string_agg(policyname||':'||roles::text, ',' ORDER BY policyname), '')
      FROM pg_policies WHERE schemaname='public' AND tablename='${table}'`);
  check('RLS', policies.includes(`${table}_user_isolation`), `${table}: policy de isolamento ausente (${policies})`);
  check('RLS', !/\banon\b|\{public\}/.test(policies), `${table}: policy exposta a anon/PUBLIC (${policies})`);

  const anonPriv = query(`SELECT count(*) FROM pg_class c, aclexplode(c.relacl) a
     WHERE c.oid='public.${table}'::regclass AND a.grantee::regrole::text IN ('anon','public')`);
  check('GRANT', anonPriv === '0', `${table}: anon/PUBLIC ainda tem ${anonPriv} privilégio(s)`);
}

const acctPriv = query(`SELECT string_agg(DISTINCT a.privilege_type, ',' ORDER BY a.privilege_type)
    FROM pg_class c, aclexplode(c.relacl) a
   WHERE c.oid='public.monitoring_center_accounts'::regclass AND a.grantee::regrole::text='authenticated'`);
check('GRANT', acctPriv === 'DELETE,INSERT,SELECT,UPDATE', `grants de authenticated em accounts inesperados (${acctPriv})`);

// A fila é a fonte da verdade do que a central recebe: UI não escreve nela.
const dispPriv = query(`SELECT string_agg(DISTINCT a.privilege_type, ',' ORDER BY a.privilege_type)
    FROM pg_class c, aclexplode(c.relacl) a
   WHERE c.oid='public.monitoring_center_dispatches'::regclass AND a.grantee::regrole::text='authenticated'`);
check('GRANT', dispPriv === 'SELECT', `authenticated deveria ter só SELECT em dispatches (${dispPriv})`);

// --- 2) Invariantes estruturais -------------------------------------------------
const indexes = query(`SELECT COALESCE(string_agg(indexname, ',' ORDER BY indexname), '')
    FROM pg_indexes WHERE schemaname='public' AND tablename='monitoring_center_dispatches'`);
for (const idx of [
  'uq_monitoring_center_dispatches_dedupe',
  'idx_monitoring_center_dispatches_queue',
  'idx_monitoring_center_dispatches_lease',
]) {
  check('ÍNDICE', indexes.includes(idx), `índice ${idx} ausente (${indexes})`);
}

const constraints = query(`SELECT COALESCE(string_agg(conname, ',' ORDER BY conname), '')
    FROM pg_constraint WHERE conrelid='public.monitoring_center_dispatches'::regclass AND contype='c'`);
for (const c of ['monitoring_center_dispatches_lease_sane', 'monitoring_center_dispatches_delivered_sane']) {
  check('CHECK', constraints.includes(c), `constraint ${c} ausente (${constraints})`);
}

// --- 3) Paridade SQL ↔ TS ---------------------------------------------------------
const sqlPol = query(`SELECT max_attempts||'|'||base_backoff_seconds||'|'||max_backoff_seconds||'|'||
  lease_seconds||'|'||dedupe_window_seconds||'|'||deadline_seconds||'|'||heartbeat_seconds
  FROM public.monitoring_center_policy()`);
check(
  'PARIDADE',
  sqlPol ===
    `${ts.maxAttempts}|${ts.baseBackoffSeconds}|${ts.maxBackoffSeconds}|${ts.leaseSeconds}|${ts.dedupeWindowSeconds}|${ts.deadlineSeconds}|${ts.heartbeatSeconds}`,
  `monitoring_center_policy() = ${sqlPol}, TS = ${JSON.stringify(ts)}`,
);

for (const entry of tsMap) {
  const [kind, code, qualifier, priority] = entry.split('|');
  const sql = query(`SELECT COALESCE((SELECT code||'|'||qualifier||'|'||priority
      FROM public.contact_id_for_event('${kind}')), 'MISSING')`);
  check('PARIDADE', sql === `${code}|${qualifier}|${priority}`, `contact_id_for_event('${kind}') = ${sql}, TS = ${code}|${qualifier}|${priority}`);
}

const sqlOnly = query(`SELECT count(*) FROM (VALUES ('panic'),('duress'),('fire'),('intrusion'),('perimeter'),
  ('tamper'),('blacklist_plate'),('loitering'),('camera_offline'),('camera_online'),('agent_offline'),
  ('agent_online'),('storage_failure'),('arm'),('disarm'),('heartbeat')) v(k)
  WHERE EXISTS (SELECT 1 FROM public.contact_id_for_event(v.k))`);
check('PARIDADE', Number(sqlOnly) === tsMap.length, `SQL mapeia ${sqlOnly} eventos, TS mapeia ${tsMap.length}`);

// Backoff idêntico ao TypeScript, degrau a degrau.
for (let a = 1; a <= 8; a += 1) {
  const expected = Math.min(ts.baseBackoffSeconds * 2 ** (a - 1), ts.maxBackoffSeconds);
  const got = query(`SELECT public.monitoring_center_backoff_seconds(${a})`);
  check('PARIDADE', Number(got) === expected, `backoff(${a}) SQL=${got} TS=${expected}`);
}

// --- 4) Rotinas ---------------------------------------------------------------------
const routines = [
  'monitoring_center_policy',
  'contact_id_for_event',
  'monitoring_center_backoff_seconds',
  'enqueue_monitoring_center_event',
  'claim_monitoring_center_dispatches',
  'settle_monitoring_center_dispatch',
  'reap_monitoring_center_leases',
];
for (const fn of routines) {
  const meta = query(`SELECT p.prosecdef||'|'||COALESCE(array_to_string(p.proconfig, ','), '')
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname='${fn}'`);
  check('ROTINA', meta.startsWith('t|'), `${fn} não é SECURITY DEFINER (${meta})`);
  check('ROTINA', /search_path=public/.test(meta), `${fn} sem search_path fixo (${meta})`);

  const exposed = query(`SELECT COALESCE(string_agg(DISTINCT a.grantee::regrole::text, ','), '')
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace, aclexplode(p.proacl) a
     WHERE n.nspname='public' AND p.proname='${fn}'
       AND a.grantee::regrole::text IN ('anon','authenticated','public')`);
  check('EXECUTE', exposed === '', `${fn} executável por ${exposed}`);
}

// --- 5) Bateria funcional (transação revertida) ---------------------------------------
const functional = execFileSync(
  'psql',
  ['-v', 'ON_ERROR_STOP=1', '-tA', '-f', '-'],
  {
    encoding: 'utf8',
    input: `
BEGIN;
DO $$
DECLARE
  u   uuid;
  acc uuid;
  r   jsonb;
  d   uuid;
  n   int;
BEGIN
  -- Sem FK para auth.users: o dono é sintético e a transação é revertida.
  u := gen_random_uuid();

  INSERT INTO public.monitoring_center_accounts
    (user_id, provider, label, account_code, endpoint_url, event_kinds)
  VALUES (u, 'sigma', 'Central 126', 'AB12', 'https://receptora.example/dc09',
          ARRAY['panic','intrusion','camera_offline'])
  RETURNING id INTO acc;

  -- Evento não assinado é recusado sem virar ruído na fila.
  r := public.enqueue_monitoring_center_event(acc, 'loitering');
  ASSERT (r->>'queued')::boolean IS FALSE AND r->>'reason' = 'event_not_subscribed', r::text;

  -- Evento desconhecido nunca inventa código.
  r := public.enqueue_monitoring_center_event(acc, 'evento_inexistente');
  ASSERT r->>'reason' = 'unmapped_event', r::text;

  -- Enfileira e deduplica dentro da janela.
  r := public.enqueue_monitoring_center_event(acc, 'intrusion', '7', NULL, '{}'::jsonb, now());
  ASSERT (r->>'queued')::boolean AND r->>'code' = '130' AND r->>'zone_code' = '007', r::text;
  r := public.enqueue_monitoring_center_event(acc, 'intrusion', '007', NULL, '{}'::jsonb, now() + interval '5 s');
  ASSERT r->>'reason' = 'deduplicated', r::text;
  -- Fora da janela, o mesmo fato volta a ser reportável.
  r := public.enqueue_monitoring_center_event(acc, 'intrusion', '007', NULL, '{}'::jsonb, now() + interval '200 s');
  ASSERT (r->>'queued')::boolean, r::text;

  -- Pânico entra com prioridade 1 e deve ser reclamado primeiro.
  r := public.enqueue_monitoring_center_event(acc, 'panic', '000', NULL, '{}'::jsonb, now());
  ASSERT (r->>'priority')::int = 1, r::text;

  SELECT id INTO d FROM public.claim_monitoring_center_dispatches('w1', 1);
  ASSERT (SELECT event_kind FROM public.monitoring_center_dispatches WHERE id = d) = 'panic';
  ASSERT (SELECT status='claimed' AND claimed_by='w1' AND lease_expires_at IS NOT NULL
            FROM public.monitoring_center_dispatches WHERE id = d);

  -- Falha: recuo de 15s e volta para pending.
  r := public.settle_monitoring_center_dispatch(d, false, 'timeout');
  ASSERT r->>'reason' = 'retry' AND (r->>'next_attempt_in_seconds')::int = 15, r::text;
  ASSERT (SELECT status='pending' AND attempts=1 AND next_attempt_at > now()
            FROM public.monitoring_center_dispatches WHERE id = d);

  -- Exaustão de tentativas (2..5) ainda dentro do prazo final.
  FOR n IN 2..4 LOOP
    r := public.settle_monitoring_center_dispatch(d, false, 'timeout');
    ASSERT r->>'reason' = 'retry', n::text||' -> '||r::text;
  END LOOP;
  r := public.settle_monitoring_center_dispatch(d, false, 'timeout');
  ASSERT r->>'status' = 'failed' AND r->>'reason' = 'attempts_exhausted', r::text;
  -- Idempotência: estado terminal não regride.
  r := public.settle_monitoring_center_dispatch(d, true, NULL);
  ASSERT r->>'reason' = 'terminal' AND r->>'status' = 'failed', r::text;

  -- Prazo final vence tentativas restantes.
  r := public.enqueue_monitoring_center_event(acc, 'camera_offline', '012', NULL, '{}'::jsonb, now() - interval '2 h');
  d := (r->>'dispatch_id')::uuid;
  r := public.settle_monitoring_center_dispatch(d, false, 'central fora');
  ASSERT r->>'status' = 'expired' AND r->>'reason' = 'deadline_exceeded', r::text;

  -- Entrega feliz.
  r := public.enqueue_monitoring_center_event(acc, 'panic', '001', NULL, '{}'::jsonb, now() + interval '400 s');
  d := (r->>'dispatch_id')::uuid;
  PERFORM public.claim_monitoring_center_dispatches('w2', 10);
  r := public.settle_monitoring_center_dispatch(d, true, NULL);
  ASSERT r->>'status' = 'delivered', r::text;
  ASSERT (SELECT delivered_at IS NOT NULL AND lease_expires_at IS NULL
            FROM public.monitoring_center_dispatches WHERE id = d);

  -- Reaping de lease vencida devolve o item para a fila.
  r := public.enqueue_monitoring_center_event(acc, 'intrusion', '099', NULL, '{}'::jsonb, now() + interval '500 s');
  d := (r->>'dispatch_id')::uuid;
  PERFORM public.claim_monitoring_center_dispatches('w3', 10);
  r := public.reap_monitoring_center_leases(now() + interval '10 min');
  ASSERT (r->>'released')::int >= 1, r::text;
  ASSERT (SELECT status='pending' AND claimed_by IS NULL FROM public.monitoring_center_dispatches WHERE id = d);

  -- Conta desativada para de gerar tráfego para a central.
  UPDATE public.monitoring_center_accounts SET enabled = false WHERE id = acc;
  r := public.enqueue_monitoring_center_event(acc, 'panic', '002', NULL, '{}'::jsonb, now() + interval '900 s');
  ASSERT r->>'reason' = 'account_disabled', r::text;

  RAISE NOTICE 'OK';
END $$;
ROLLBACK;
`,
  },
);

check('FUNCIONAL', /OK|SKIP/.test(functional) || functional === '', `bateria funcional falhou: ${functional}`);

if (failures.length > 0) {
  console.error('\n❌ Gate de centrais de monitoramento (Onda 126) reprovado:');
  for (const f of failures) console.error(`   - ${f}`);
  process.exit(1);
}
console.log('✅ Gate de centrais (Onda 126): RLS, privilégios, paridade SQL↔TS e escada de reentrega OK.');
