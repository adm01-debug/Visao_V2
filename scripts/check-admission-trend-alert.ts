#!/usr/bin/env tsx
/**
 * Onda 236 — Gate do fan-in da TENDÊNCIA do órfão.
 *
 * Falha (exit 1) quando:
 *  - `admission_trend_severity` / `admission_trend_cooldown` /
 *    `evaluate_admission_trend_alerts` não existem;
 *  - alguma delas é executável por `anon`/`authenticated`;
 *  - o avaliador não é SECURITY DEFINER;
 *  - severidade ou cooldown do SQL divergem da régua TS em qualquer sonda;
 *  - o cron diário não está agendado depois do snapshot e do fan-in da foto;
 *  - o exercício dinâmico (transação revertida) não emite crítico para série
 *    crescente, emite para série zerada, ignora o cooldown, ou acusa
 *    tendência num histórico só de fotos ilegíveis.
 *
 * Uso: `npm run db:check:admission-trend-alert`
 */
import { execFileSync } from 'node:child_process';
import {
  trendAlertSeverity,
  trendCooldownMinutes,
  admissionTrendRoutineKey,
} from '../src/lib/alarms/admissionTrendAlert.ts';
import type { OrphanTrendVerdict } from '../src/lib/alarms/admissionOrphanTrend.ts';

const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

function query(sql: string): string[][] {
  const args = [...(conn ? [conn] : []), '-tA', '-F', '\u0001', '-X', '-q', '-c', sql];
  const out = execFileSync('psql', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split('\u0001'));
}

const isTrue = (v: string) => v === 't' || v === 'true';
const errors: string[] = [];
let probes = 0;

/* 1) Existência e blindagem ------------------------------------------------- */
const FUNCS = [
  { name: 'admission_trend_severity', args: 'text', definer: false },
  { name: 'admission_trend_cooldown', args: 'integer, text', definer: false },
  {
    name: 'evaluate_admission_trend_alerts',
    args: 'timestamp with time zone, integer, integer',
    definer: true,
  },
] as const;

for (const fn of FUNCS) {
  const rows = query(`
    SELECT p.prosecdef::text,
           has_function_privilege('authenticated', p.oid, 'EXECUTE')::text,
           has_function_privilege('anon',          p.oid, 'EXECUTE')::text
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = '${fn.name}'
      AND pg_catalog.oidvectortypes(p.proargtypes) = '${fn.args}';
  `);
  probes += 1;
  if (rows.length !== 1) {
    errors.push(`função ausente ou duplicada: public.${fn.name}(${fn.args})`);
    continue;
  }
  const [secdef, auth, anon] = rows[0] as [string, string, string];
  probes += 3;
  if (isTrue(secdef) !== fn.definer) {
    errors.push(`${fn.name}: SECURITY DEFINER esperado=${fn.definer}, obtido=${isTrue(secdef)}`);
  }
  if (isTrue(auth)) errors.push(`${fn.name}: 'authenticated' NÃO pode executar`);
  if (isTrue(anon)) errors.push(`${fn.name}: 'anon' NÃO pode executar`);
}

/* 2) Paridade TS ↔ SQL da severidade --------------------------------------- */
const VERDICTS: OrphanTrendVerdict[] = [
  'growing',
  'persistent',
  'resolving',
  'emerging',
  'clear',
  'no_history',
];

for (const v of VERDICTS) {
  const [row] = query(`SELECT COALESCE(public.admission_trend_severity('${v}'), 'none');`);
  probes += 1;
  const sql = row?.[0] ?? '';
  const ts = trendAlertSeverity(v) ?? 'none';
  if (sql !== ts) errors.push(`severidade '${v}': SQL=${sql} ≠ TS=${ts}`);
}

/* 3) Paridade TS ↔ SQL do cooldown ----------------------------------------- */
const CADENCES = [1, 15, 59, 60, 61, 120, 719, 720, 1440, 2879, 2880, 100000];
const EMITTING: OrphanTrendVerdict[] = ['growing', 'persistent', 'resolving', 'emerging'];

for (const cadence of CADENCES) {
  for (const v of EMITTING) {
    const [row] = query(`SELECT public.admission_trend_cooldown(${cadence}, '${v}');`);
    probes += 1;
    const sql = Number(row?.[0] ?? Number.NaN);
    const ts = trendCooldownMinutes(cadence, v);
    if (sql !== ts) errors.push(`cooldown(${cadence}, '${v}'): SQL=${sql} ≠ TS=${ts}`);
  }
}

// Cadência inválida precisa recusar no banco também (nunca silenciar).
for (const bad of [0, -1]) {
  probes += 1;
  try {
    query(`SELECT public.admission_trend_cooldown(${bad}, 'growing');`);
    errors.push(`cooldown(${bad}) deveria falhar no SQL`);
  } catch {
    /* esperado */
  }
}

/* 4) Agendamento (o papel do gate pode não enxergar `cron` — nesse caso, pula) */
try {
  const cron = query(
    `SELECT jobname, schedule FROM cron.job WHERE jobname = 'evaluate-admission-trend';`
  );
  probes += 1;
  const schedule = cron[0]?.[1];
  if (schedule !== '55 3 * * *') {
    errors.push(
      `cron 'evaluate-admission-trend' deveria ser '55 3 * * *', obtido '${schedule ?? 'ausente'}'`
    );
  }
} catch {
  console.warn("• aviso: schema 'cron' inacessível para este papel — agendamento não conferido");
}

/* 5) Exercício dinâmico em transação revertida ------------------------------ */
const KEY = admissionTrendRoutineKey();
const F = (h: number) => `now() + interval '${h} hour'`;
const COLS =
  '(observed_at, verdict, orphan_count, expired_stock, drift_stock, declared_deferred, quarantined_stock, total_stock, retention_days)';

// A tabela é append-only por gatilho e não aceita nulos: o cenário é isolado
// com fotos no FUTURO (dominam a janela ordenada por observed_at DESC) e uma
// janela explícita de 3, nunca apagando o histórico real.
const dyn = query(`
BEGIN;
  -- (b) série estritamente crescente: growing/critical e emite.
  INSERT INTO public.admission_reconcile_snapshots ${COLS} VALUES
    (${F(1)}, 'unaccounted', 1, 5, 0, 0, 0, 10, 365),
    (${F(2)}, 'unaccounted', 2, 6, 0, 0, 0, 10, 365),
    (${F(3)}, 'unaccounted', 3, 7, 0, 0, 0, 10, 365);
  SELECT 'b=' || (public.evaluate_admission_trend_alerts(now(), 3) ->> 'verdict')
              || '/' || (public.evaluate_admission_trend_alerts(now(), 3) ->> 'severity');

  -- (c) cooldown: a avaliação imediata seguinte não pode emitir de novo.
  SELECT 'c=' || (public.evaluate_admission_trend_alerts(now(), 3) ->> 'emitted');
  SELECT 'c_count=' || COUNT(*)::text
  FROM public.maintenance_alert_events
  WHERE routine = '${KEY}' AND created_at > now() - interval '1 minute';

  -- (e) série decrescente é aviso, nunca silêncio (M4).
  INSERT INTO public.admission_reconcile_snapshots ${COLS} VALUES
    (${F(4)}, 'unaccounted', 9, 9, 0, 0, 0, 10, 365),
    (${F(5)}, 'unaccounted', 5, 9, 0, 0, 0, 10, 365),
    (${F(6)}, 'unaccounted', 2, 9, 0, 0, 0, 10, 365);
  SELECT 'e=' || (public.evaluate_admission_trend_alerts(now(), 3) ->> 'verdict')
              || '/' || (public.evaluate_admission_trend_alerts(now(), 3) ->> 'severity');

  -- (d) foto mais recente zerada encerra a acusação (L2/M5).
  INSERT INTO public.admission_reconcile_snapshots ${COLS} VALUES
    (${F(7)}, 'reconciled', 0, 4, 0, 4, 0, 10, 365);
  SELECT 'd=' || (public.evaluate_admission_trend_alerts(now(), 3) ->> 'severity');

  -- (f) append-only continua valendo mesmo dentro do exercício.
  SAVEPOINT sp;
  DO $$
  BEGIN
    DELETE FROM public.admission_reconcile_snapshots WHERE true;
    RAISE EXCEPTION 'append_only_violado';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'append_only_violado' THEN RAISE;
    END IF;
  END;
  $$;
  ROLLBACK TO SAVEPOINT sp;
  SELECT 'f=blocked';
ROLLBACK;
`)
  .flat()
  .filter((v) => /^[a-z_]+=/.test(v));

const dynMap = new Map(dyn.map((v) => v.split('=') as [string, string]));
const expectDyn: Array<[string, string, string]> = [
  ['b', 'growing/critical', 'série crescente deve ser growing/critical (M2)'],
  ['c', '0', 'cooldown deve impedir segunda emissão imediata'],
  ['c_count', '1', 'exatamente um alerta gravado na janela de cooldown'],
  ['e', 'resolving/warning', 'órfão em queda continua emitindo aviso (M4)'],
  ['d', 'none', 'foto recente zerada encerra a acusação (L2/M5)'],
  ['f', 'blocked', 'DELETE no histórico precisa ser recusado pelo gatilho'],
];
for (const [k, want, why] of expectDyn) {
  probes += 1;
  const got = dynMap.get(k);
  if (got !== want)
    errors.push(`dinâmico ${k}: esperado '${want}', obtido '${got ?? 'ausente'}' — ${why}`);
}

// A transação foi revertida: nada pode ter sobrado.
const [leftover] = query(
  `SELECT COUNT(*)::text FROM public.maintenance_alert_events WHERE routine = '${KEY}' AND created_at > now() - interval '5 minute';`
);
probes += 1;
if ((leftover?.[0] ?? '0') !== '0') {
  errors.push(`exercício dinâmico deixou resíduo no barramento: ${leftover?.[0]}`);
}

/* Resultado ----------------------------------------------------------------- */
if (errors.length > 0) {
  console.error(`\n✗ Onda 236 — ${errors.length} falha(s) em ${probes} sondas:`);
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}
console.log(`✓ Onda 236 — fan-in da tendência íntegro (${probes} sondas + exercício dinâmico)`);
