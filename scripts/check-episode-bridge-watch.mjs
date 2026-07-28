#!/usr/bin/env node
/**
 * Gate de CI — Onda 185: vigia da ponte de episódios travada.
 *
 * Prova, no banco real:
 *  1. Contrato e exposição da rotina (SECURITY DEFINER, search_path fixo,
 *     sem EXECUTE para anon/authenticated/PUBLIC).
 *  2. Paridade literal SQL ↔ TypeScript de TODOS os limiares.
 *  3. Bateria funcional em BEGIN ... ROLLBACK, com o veredito conferido
 *     contra a régua TypeScript no mesmo conjunto de amostras:
 *       a) menos de 3 execuções → "não sei", nunca "saudável";
 *       b) fila zerada → saudável, sem alerta;
 *       c) fila drenando de patamar alto → sem alerta;
 *       d) patamar absoluto ≥ 100 mesmo estável → crítico;
 *       e) crescimento moderado → atenção;
 *       f) crescimento forte → crítico;
 *       g) leitura com carimbo no futuro é descartada, não vira base;
 *       h) janela: execução fora das 72h não conta;
 *       i) cooldown: segunda avaliação seguida não duplica o alerta.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { assessEpisodeBridge } from '../src/lib/retention/episodeBridgeWatch.ts';

const failures = [];
const query = (sql) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
const queryTx = (sql) =>
  query(sql)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && l !== 'BEGIN' && l !== 'ROLLBACK')
    .join('\n');
const check = (label, condition, detail) => {
  if (!condition) failures.push(`${label}: ${detail}`);
};

const source = readFileSync(
  new URL('../src/lib/retention/episodeBridgeWatch.ts', import.meta.url),
  'utf8',
);

// --- 1) Contrato e exposição -----------------------------------------------------
const shape = query(`
  SELECT COALESCE(string_agg(p.proname||':'||p.prosecdef||':'||
           (EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig,'{}')) c WHERE c LIKE 'search_path=%'))::text,
           ',' ORDER BY p.proname), '')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('evaluate_abandoned_episode_alerts','episode_bridge_watch_policy')`);
check('CONTRATO', shape.includes('evaluate_abandoned_episode_alerts:t:true'), `rotina malformada: ${shape}`);
check('CONTRATO', shape.includes('episode_bridge_watch_policy:f:true'), `política malformada: ${shape}`);

const exposure = query(`
  SELECT COALESCE(string_agg(DISTINCT p.proname||':'||a.grantee::regrole::text, ','), '')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
   WHERE n.nspname = 'public'
     AND p.proname IN ('evaluate_abandoned_episode_alerts','episode_bridge_watch_policy')
     AND a.privilege_type = 'EXECUTE'
     AND a.grantee::regrole::text IN ('anon','authenticated','public','-')`);
check('EXPOSIÇÃO', exposure === '', `rotina de serviço exposta indevidamente: ${exposure}`);

// --- 2) Paridade de limiares -------------------------------------------------------
const sqlPolicy = query(`
  SELECT (p ->> 'minSamples')||'|'||(p ->> 'trendWindowHours')||'|'||(p ->> 'noiseFloor')||'|'||
         (p ->> 'warnGrowth')||'|'||(p ->> 'criticalGrowth')||'|'||(p ->> 'absoluteCriticalFloor')
    FROM public.episode_bridge_watch_policy() p`);
const tsPolicy = [
  /MIN_SAMPLES\s*=\s*(\d+)/,
  /TREND_WINDOW_HOURS\s*=\s*(\d+)/,
  /NOISE_FLOOR\s*=\s*(\d+)/,
  /WARN_GROWTH\s*=\s*(\d+)/,
  /CRITICAL_GROWTH\s*=\s*(\d+)/,
  /ABSOLUTE_CRITICAL_FLOOR\s*=\s*(\d+)/,
]
  .map((re) => re.exec(source)?.[1] ?? '?')
  .join('|');
check('PARIDADE', sqlPolicy === tsPolicy, `limiares divergentes SQL='${sqlPolicy}' TS='${tsPolicy}'`);

// --- 3) Bateria funcional ----------------------------------------------------------
const NOW_SQL = `timestamptz '2026-07-28 12:00:00+00'`;
const NOW_MS = Date.parse('2026-07-28T12:00:00Z');

/**
 * Cenário: lista de [horasAtras, abandonados]. Roda no banco e na régua TS
 * sobre exatamente as mesmas amostras — divergência reprova.
 */
const scenarios = [
  { name: 'amostra insuficiente', rows: [[10, 40], [5, 60]], verdict: 'insufficient_data', emitted: 0 },
  { name: 'fila zerada', rows: [[50, 0], [24, 0], [1, 0]], verdict: 'healthy', emitted: 0 },
  { name: 'drenando de patamar alto', rows: [[60, 80], [30, 60], [1, 40]], verdict: 'draining', emitted: 0 },
  { name: 'patamar absoluto estável', rows: [[60, 140], [30, 140], [1, 140]], verdict: 'stuck', emitted: 1 },
  { name: 'crescimento moderado', rows: [[60, 4], [30, 7], [1, 10]], verdict: 'growing', emitted: 1 },
  { name: 'crescimento forte', rows: [[60, 5], [30, 20], [1, 40]], verdict: 'stuck', emitted: 1 },
  { name: 'ruído sob o piso', rows: [[60, 0], [30, 1], [1, 2]], verdict: 'tolerated', emitted: 0 },
  // Leitura no futuro (−1h significa "daqui a 1h") tem de ser descartada; se
  // virasse base, o crescimento apareceria invertido.
  { name: 'carimbo no futuro descartado', rows: [[-1, 0], [60, 4], [30, 7], [1, 10]], verdict: 'growing', emitted: 1 },
  // Fora da janela de 72h: sobram 2 amostras, logo "não sei".
  { name: 'fora da janela', rows: [[200, 1], [60, 30], [1, 60]], verdict: 'insufficient_data', emitted: 0 },
];

for (const scenario of scenarios) {
  const values = scenario.rows
    .map(
      ([hours, count]) =>
        `(${NOW_SQL} - make_interval(mins => ${Math.round(hours * 60)}), 0, 0, ${count}, false, '{}'::jsonb)`,
    )
    .join(',');

  const out = queryTx(`
BEGIN;
  SET LOCAL client_min_messages = warning;
  DELETE FROM public.maintenance_alert_events WHERE routine = 'retention:alarm_recurrence_bridge';
  ALTER TABLE public.alarm_recurrence_purge_runs DISABLE TRIGGER USER;
  DELETE FROM public.alarm_recurrence_purge_runs;
  INSERT INTO public.alarm_recurrence_purge_runs
    (executed_at, deleted_episodes, pending_episodes, abandoned_open, truncated, policy)
  VALUES ${values};
  SELECT 'r=' || (public.evaluate_abandoned_episode_alerts(${NOW_SQL}) ->> 'verdict')
       || ';e=' || (public.evaluate_abandoned_episode_alerts(${NOW_SQL}) ->> 'emitted');
  SELECT 'total=' || count(*) FROM public.maintenance_alert_events
   WHERE routine = 'retention:alarm_recurrence_bridge';
ROLLBACK;
`);

  const verdictLine = out.split('\n').find((l) => l.startsWith('r=')) ?? '';
  const totalLine = out.split('\n').find((l) => l.startsWith('total=')) ?? '';
  const [, verdict] = /^r=([a-z_]+)/.exec(verdictLine) ?? [];

  check('FUNCIONAL', verdict === scenario.verdict, `${scenario.name}: SQL disse '${verdict}', esperado '${scenario.verdict}'`);

  // A régua TypeScript tem de concordar sobre as MESMAS amostras.
  const tsVerdict = assessEpisodeBridge(
    scenario.rows.map(([hours, count]) => ({
      executedAt: NOW_MS - hours * 3_600_000,
      abandonedOpen: count,
    })),
    NOW_MS,
  ).verdict;
  check('PARIDADE', tsVerdict === scenario.verdict, `${scenario.name}: TS disse '${tsVerdict}', esperado '${scenario.verdict}'`);

  // Cooldown: a rotina roda DUAS vezes acima; só pode existir 1 alerta.
  check(
    'COOLDOWN',
    totalLine === `total=${scenario.emitted}`,
    `${scenario.name}: avaliação repetida duplicou alerta (${totalLine}, esperado total=${scenario.emitted})`,
  );
  check(
    'FUNCIONAL',
    verdictLine.endsWith(';e=0') || scenario.emitted === 1,
    `${scenario.name}: segunda avaliação emitiu alerta apesar do cooldown (${verdictLine})`,
  );
}

// --- Veredito ---------------------------------------------------------------------
if (failures.length > 0) {
  console.error('❌ Gate do vigia da ponte de episódios (Onda 185) reprovado:');
  for (const failure of failures) console.error(`   • ${failure}`);
  process.exit(1);
}
console.log(`✅ Gate do vigia da ponte de episódios (Onda 185) aprovado — ${scenarios.length} cenários no banco.`);
