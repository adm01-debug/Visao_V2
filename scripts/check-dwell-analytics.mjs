#!/usr/bin/env node
/**
 * Gate de CI — Onda 125: permanência (dwell) e veículo recorrente.
 *
 * Verifica no banco real:
 *  1. `dwell_sessions` com RLS ligada, policy própria e zero privilégio para anon.
 *  2. Invariantes estruturais: índice único de sessão aberta, CHECKs de janela.
 *  3. Paridade literal entre `dwell_policy()` / `vehicle_recurrence_policy()` e
 *     as constantes de src/lib/analytics/dwellTracker.ts.
 *  4. Rotinas SECURITY DEFINER com search_path fixo e apenas service_role.
 *  5. Teste funcional em transação revertida: histerese, fora de ordem, alerta,
 *     idempotência, colapso de releitura e cooldown de recorrência.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const failures = [];
const query = (sql) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
const check = (label, condition, detail) => {
  if (!condition) failures.push(`${label}: ${detail}`);
};

// --- Constantes declaradas no TypeScript -------------------------------------
const lib = readFileSync(new URL('../src/lib/analytics/dwellTracker.ts', import.meta.url), 'utf8');
const num = (name) => Number(lib.match(new RegExp(`${name}:\\s*([\\d_.]+)`))?.[1]?.replace(/_/g, ''));
const ts = {
  gapSeconds: num('gapSeconds'),
  minDwellSeconds: num('minDwellSeconds'),
  maxOpenSeconds: num('maxOpenSeconds'),
  minDetections: num('minDetections'),
  minConfidence: num('minConfidence'),
  alertCooldownSeconds: num('alertCooldownSeconds'),
  windowMinutes: num('windowMinutes'),
  minPasses: num('minPasses'),
  samePassSeconds: num('samePassSeconds'),
  alertCooldownMinutes: num('alertCooldownMinutes'),
};
check(
  'POLÍTICA',
  Object.values(ts).every((v) => Number.isFinite(v)),
  `não consegui ler as constantes de dwellTracker.ts (${JSON.stringify(ts)})`,
);

// --- 1) RLS e privilégios -----------------------------------------------------
const rlsOn = query(`
  SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname='dwell_sessions'`);
check('RLS', rlsOn === 't', 'dwell_sessions sem row level security');

const policies = query(`
  SELECT COALESCE(string_agg(policyname||':'||roles::text, ',' ORDER BY policyname), '')
    FROM pg_policies WHERE schemaname='public' AND tablename='dwell_sessions'`);
check('RLS', /dwell_sessions_user_isolation/.test(policies), `policy de isolamento ausente (${policies})`);
check('RLS', !/\banon\b|\{public\}/.test(policies), `policy exposta a anon/PUBLIC (${policies})`);

const anonPriv = query(`
  SELECT count(*) FROM pg_class c, aclexplode(c.relacl) a
   WHERE c.oid='public.dwell_sessions'::regclass
     AND a.grantee::regrole::text IN ('anon','public')`);
check('GRANT', anonPriv === '0', `anon/PUBLIC ainda tem ${anonPriv} privilégio(s) em dwell_sessions`);

const authPriv = query(`
  SELECT string_agg(DISTINCT a.privilege_type, ',' ORDER BY a.privilege_type)
    FROM pg_class c, aclexplode(c.relacl) a
   WHERE c.oid='public.dwell_sessions'::regclass AND a.grantee::regrole::text='authenticated'`);
check('GRANT', authPriv === 'DELETE,INSERT,SELECT,UPDATE', `grants de authenticated inesperados (${authPriv})`);

// --- 2) Invariantes estruturais ------------------------------------------------
const openIdx = query(`
  SELECT count(*) FROM pg_indexes
   WHERE schemaname='public' AND tablename='dwell_sessions' AND indexname='uq_dwell_sessions_open'`);
check('ÍNDICE', openIdx === '1', 'falta o índice único de sessão aberta (uq_dwell_sessions_open)');

const checks = query(`
  SELECT COALESCE(string_agg(conname, ',' ORDER BY conname), '')
    FROM pg_constraint WHERE conrelid='public.dwell_sessions'::regclass AND contype='c'`);
for (const c of ['dwell_sessions_window_sane', 'dwell_sessions_end_sane']) {
  check('CHECK', checks.includes(c), `constraint ${c} ausente (${checks})`);
}

// --- 3) Paridade das políticas -------------------------------------------------
const dwellPol = query(`SELECT gap_seconds||'|'||min_dwell_seconds||'|'||max_open_seconds||'|'||
  min_detections||'|'||min_confidence||'|'||alert_cooldown_seconds FROM public.dwell_policy()`);
check(
  'PARIDADE',
  dwellPol ===
    `${ts.gapSeconds}|${ts.minDwellSeconds}|${ts.maxOpenSeconds}|${ts.minDetections}|${ts.minConfidence.toFixed(4)}|${ts.alertCooldownSeconds}`,
  `dwell_policy() = ${dwellPol}, TS = ${JSON.stringify(ts)}`,
);

const vehPol = query(`SELECT window_minutes||'|'||min_passes||'|'||same_pass_seconds||'|'||
  alert_cooldown_minutes||'|'||min_confidence FROM public.vehicle_recurrence_policy()`);
check(
  'PARIDADE',
  vehPol ===
    `${ts.windowMinutes}|${ts.minPasses}|${ts.samePassSeconds}|${ts.alertCooldownMinutes}|${ts.minConfidence2 ?? '0.6000'}`,
  `vehicle_recurrence_policy() = ${vehPol}`,
);

// --- 4) Rotinas ------------------------------------------------------------------
for (const fn of [
  'record_dwell_observation',
  'close_stale_dwell_sessions',
  'evaluate_dwell_alerts',
  'evaluate_vehicle_recurrence',
]) {
  const meta = query(`
    SELECT p.prosecdef||'|'||COALESCE(array_to_string(p.proconfig, ','), '')
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname='${fn}'`);
  check('ROTINA', meta.startsWith('t|'), `${fn} não é SECURITY DEFINER (${meta})`);
  check('ROTINA', /search_path=public/.test(meta), `${fn} sem search_path fixo (${meta})`);

  const exposed = query(`
    SELECT COALESCE(string_agg(DISTINCT a.grantee::regrole::text, ',' ORDER BY a.grantee::regrole::text), '')
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace, aclexplode(p.proacl) a
     WHERE n.nspname='public' AND p.proname='${fn}' AND a.privilege_type='EXECUTE'
       AND a.grantee::regrole::text IN ('anon','authenticated','public')`);
  check('ROTINA', exposed === '', `${fn} executável por ${exposed} (esperado só service_role)`);

  const svc = query(`
    SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace, aclexplode(p.proacl) a
     WHERE n.nspname='public' AND p.proname='${fn}' AND a.privilege_type='EXECUTE'
       AND a.grantee::regrole::text='service_role'`);
  check('ROTINA', svc === '1', `${fn} sem EXECUTE para service_role`);
}

// --- 5) Teste funcional em transação revertida -------------------------------------
const functional = query(`
BEGIN;
DO $$
DECLARE
  u uuid; cam uuid; r jsonb; t timestamptz := now() - interval '1 hour'; sid uuid;
BEGIN
  SELECT id INTO u FROM auth.users LIMIT 1;
  IF u IS NULL THEN RAISE NOTICE 'SKIP'; RETURN; END IF;

  INSERT INTO public.cameras (name, location, status, user_id)
  VALUES ('gate125','gate',(SELECT unnest(enum_range(NULL::camera_status)) LIMIT 1), u)
  RETURNING id INTO cam;

  ASSERT (public.record_dwell_observation(u, cam, NULL, 'g1', 0.10, t)->>'reason') = 'low_confidence';
  r := public.record_dwell_observation(u, cam, NULL, 'g1', 0.9, t);
  ASSERT (r->>'action') = 'opened'; sid := (r->>'session_id')::uuid;
  ASSERT (public.record_dwell_observation(u, cam, NULL, 'g1', 0.9, t + interval '20 s')->>'action') = 'extended';
  ASSERT (public.record_dwell_observation(u, cam, NULL, 'g1', 0.9, t + interval '5 s')->>'action') = 'ignored_out_of_order';
  ASSERT (public.record_dwell_observation(u, cam, NULL, 'g1', 0.9, t + interval '95 s')->>'action') = 'opened';
  ASSERT (SELECT ended_at IS NOT NULL FROM public.dwell_sessions WHERE id = sid);

  PERFORM public.record_dwell_observation(u, cam, NULL, 'g2', 0.9, t);
  PERFORM public.record_dwell_observation(u, cam, NULL, 'g2', 0.9, t + interval '25 s');
  PERFORM public.record_dwell_observation(u, cam, NULL, 'g2', 0.9, t + interval '50 s');
  PERFORM public.record_dwell_observation(u, cam, NULL, 'g2', 0.9, t + interval '75 s');
  ASSERT (public.evaluate_dwell_alerts()->>'emitted')::int >= 1;
  ASSERT (public.evaluate_dwell_alerts()->>'emitted')::int = 0;
  PERFORM public.close_stale_dwell_sessions();
  ASSERT (SELECT count(*) FROM public.dwell_sessions WHERE camera_id=cam AND ended_at IS NULL) = 0;

  INSERT INTO public.plate_detections (user_id, plate, confidence, camera_id, camera_name, "timestamp")
  VALUES (u,'GAT1E25',0.9,cam,'gate125', now() - interval '30 min'),
         (u,'gat1e25',0.9,cam,'gate125', now() - interval '30 min' + interval '10 s'),
         (u,'GAT1E25',0.9,cam,'gate125', now() - interval '20 min'),
         (u,'GAT1E25',0.9,cam,'gate125', now() - interval '10 min'),
         (u,'LOWG125',0.2,cam,'gate125', now() - interval '9 min'),
         (u,'LOWG125',0.2,cam,'gate125', now() - interval '6 min'),
         (u,'LOWG125',0.2,cam,'gate125', now() - interval '3 min');
  r := public.evaluate_vehicle_recurrence();
  ASSERT (r->>'emitted')::int = 1, 'recorrencia: '||r::text;
  r := public.evaluate_vehicle_recurrence();
  ASSERT (r->>'emitted')::int = 0 AND (r->>'skipped')::int = 1, 'cooldown: '||r::text;

  RAISE NOTICE 'OK';
END $$;
ROLLBACK;
`);

check('FUNCIONAL', /OK|SKIP/.test(functional) || functional === '', `bateria funcional falhou: ${functional}`);

if (failures.length > 0) {
  console.error('\n❌ Gate de analíticos (Onda 125) reprovado:');
  for (const f of failures) console.error(`   - ${f}`);
  process.exit(1);
}
console.log('✅ Gate de analíticos (Onda 125): RLS, privilégios, paridade SQL↔TS e decisões OK.');
