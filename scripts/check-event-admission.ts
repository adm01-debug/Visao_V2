/**
 * Gate de CI — Onda 226: admissão de evento (TS ↔ SQL).
 *
 * Escrito em TypeScript, e rodado por `tsx`, porque precisa executar a régua
 * real (`admitEvent`). Um gate que reimplementa a regra em JS provaria apenas
 * que concorda consigo mesmo.
 *
 * O que é provado:
 *  1. ACL: nem `anon` nem `authenticated` executam a porta de admissão nem o
 *     autoteste — são funções SECURITY DEFINER de motor, não API pública.
 *  2. O autoteste roda **de fato** (gate estático não prova execução) e todas
 *     as fronteiras passam.
 *  3. Paridade em centenas de cenários gerados: esquemas reais são inseridos
 *     numa transação, consultados pela função do banco e desfeitos com
 *     ROLLBACK — nada é deixado para trás.
 *
 * Rode com: npm run db:check:event-admission
 */

import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { admitEvent, type AdmissionScheme } from '../src/lib/alarms/eventAdmission';
import { MINUTES_PER_DAY, type AlarmSchedule } from '../src/lib/alarms/alarmAggregation';

const failures: string[] = [];
const psql = (sql: string) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
const psqlScript = (sql: string) =>
  execFileSync('psql', ['-tA', '-v', 'ON_ERROR_STOP=1', '-f', '-'], {
    encoding: 'utf8',
    input: sql,
  }).trim();
const check = (label: string, cond: boolean, detail: string) => {
  if (!cond) failures.push(`${label}: ${detail}`);
};

/* 1 — ACL. */
// `alarm_scheme_stored_health` é pura (não toca dados) e fica de fora: o que
// precisa ficar fechado é tudo que lê linhas ou escreve.
const CLOSED_FNS = [
  'public.alarm_admit_event(uuid, text, text, timestamptz, integer)',
  'public.alarm_admission_selftest()',
];
for (const fn of CLOSED_FNS) {
  for (const role of ['anon', 'authenticated']) {
    const can = psql(`SELECT has_function_privilege('${role}', '${fn}', 'execute')`);
    check('acl', can === 'f', `${role} não pode executar ${fn}`);
  }
}

/* 2 — autoteste executado. */
const bad = psql(
  `BEGIN; SELECT coalesce(string_agg(case_name || ' (esperado ' || expected || ', obtido ' || coalesce(actual,'∅') || ')', '; '), '') FROM public.alarm_admission_selftest() WHERE NOT ok; ROLLBACK;`
)
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && l !== 'BEGIN' && l !== 'ROLLBACK')
  .join('');
check('selftest', bad === '', bad);
const passed = Number(
  psql(`BEGIN; SELECT count(*) FROM public.alarm_admission_selftest() WHERE ok; ROLLBACK;`)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^\d+$/.test(l))
    .pop() ?? '0'
);
check('selftest', passed >= 14, `apenas ${passed} fronteiras exercidas`);

/* 3 — paridade em cenários gerados. */
let seed = 226_0728;
const rnd = (n: number) => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed % n;
};

const HEALTH_SOURCE_ACTIONS = (missing: string[], declared: string[], actions: number) =>
  declared.filter((s) => !missing.includes(s)).length === 0 || actions === 0
    ? ('inoperative' as const)
    : missing.length > 0
      ? ('inconsistent' as const)
      : ('ok' as const);

const TYPES = ['motion_detection', 'intrusion', 'plate_denied'] as const;
const SOURCES = ['cam-a', 'cam-b', 'cam-c'] as const;
const WEEK = Date.UTC(2026, 6, 26, 0, 0);

// Agendas geradas já respeitam a lei S8 (sem sobreposição): o banco recusa
// linhas inválidas no gatilho, e o alvo deste gate é a *decisão*, não a
// validação de cadastro — já coberta por `db:check:alarm-schemes`.
const randomSchedule = (): AlarmSchedule | null => {
  if (rnd(5) === 0) return null;
  const out: { startMin: number; endMin: number }[][] = [];
  for (let d = 0; d < 7; d += 1) {
    const periods: { startMin: number; endMin: number }[] = [];
    let cursor = rnd(200);
    for (let i = rnd(3); i > 0; i -= 1) {
      const start = cursor + rnd(120);
      const end = start + 30 + rnd(240);
      if (end >= MINUTES_PER_DAY) break;
      periods.push({ startMin: start, endMin: end });
      cursor = end + 1 + rnd(60);
    }
    out.push(periods);
  }
  return out;
};

const userId = randomUUID();

interface Scenario {
  readonly schemes: AdmissionScheme[];
  readonly sourceId: string;
  readonly eventType: string;
  readonly at: number | null;
  readonly tz: number;
}

const scenarios: Scenario[] = [];
for (let i = 0; i < 220; i += 1) {
  const count = rnd(3) + 1;
  const schemes: AdmissionScheme[] = [];
  for (let k = 0; k < count; k += 1) {
    const declared = [...SOURCES].filter(() => rnd(2) === 0);
    if (declared.length === 0) declared.push(SOURCES[rnd(SOURCES.length)]);
    const missing = declared.filter(() => rnd(4) === 0);
    const actions = rnd(8) === 0 ? 0 : 1;
    schemes.push({
      id: `s${i}_${k}`,
      eventType: TYPES[rnd(TYPES.length)],
      enabled: rnd(6) !== 0,
      health: HEALTH_SOURCE_ACTIONS(missing, declared, actions),
      schedule: randomSchedule(),
      sourceIds: declared,
      missingSourceIds: missing,
    });
  }
  scenarios.push({
    schemes,
    sourceId: SOURCES[rnd(SOURCES.length)],
    eventType: TYPES[rnd(TYPES.length)],
    at: rnd(12) === 0 ? null : WEEK + rnd(7 * MINUTES_PER_DAY) * 60_000,
    tz: [0, -180, 330][rnd(3)],
  });
}

const lit = (v: string) => `'${v.replace(/'/g, "''")}'`;
const arr = (v: readonly string[]) => `ARRAY[${v.map(lit).join(',')}]::text[]`;

// Uma transação por cenário, desfeita ao final: o banco volta intacto.
const sqlParts: string[] = ['\\set ON_ERROR_STOP on'];
scenarios.forEach((sc, i) => {
  sqlParts.push('BEGIN;');
  sc.schemes.forEach((s, k) => {
    // O banco deriva a saúde sozinho a partir de origens + ações; aqui
    // gravamos exatamente o material que o TS usou para derivar a dele.
    const acts =
      s.health === 'inoperative' && s.sourceIds.some((x) => !s.missingSourceIds.includes(x))
        ? '[]'
        : '[{"id":"popup"}]';
    sqlParts.push(
      `INSERT INTO public.alarm_schemes(user_id,name,enabled,event_type,source_ids,missing_source_ids,actions,schedule,created_at)
       VALUES ('${userId}', 'gate-${i}-${k}', ${s.enabled}, ${lit(s.eventType)}, ${arr(s.sourceIds)}, ${arr(s.missingSourceIds)}, ${lit(acts)}::jsonb, ${s.schedule === null ? 'NULL' : `${lit(JSON.stringify(s.schedule))}::jsonb`}, now() + make_interval(secs => ${k}));`
    );
  });
  sqlParts.push(
    `SELECT ${i} || '|' || (v ->> 'admitted') || '|' || (v ->> 'reason')
       FROM (SELECT public.alarm_admit_event('${userId}', ${lit(sc.sourceId)}, ${lit(sc.eventType)}, ${sc.at === null ? 'NULL' : `'${new Date(sc.at).toISOString()}'::timestamptz`}, ${sc.tz}) AS v) t;`
  );
  sqlParts.push('ROLLBACK;');
});

const out = psqlScript(sqlParts.join('\n'))
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => /^\d+\|/.test(l));

check(
  'paridade',
  out.length === scenarios.length,
  `${out.length} respostas para ${scenarios.length} cenários`
);

let diverged = 0;
for (const line of out) {
  const [idx, admitted, reason] = line.split('|');
  const sc = scenarios[Number(idx)];
  if (!sc) continue;
  const ts = admitEvent(sc.schemes, {
    sourceId: sc.sourceId,
    eventType: sc.eventType,
    at: sc.at,
    tzOffsetMinutes: sc.tz,
  });
  const sqlAdmitted = admitted === 'true';
  if (sqlAdmitted !== ts.admitted || reason !== ts.reason) {
    diverged += 1;
    if (diverged <= 5) {
      failures.push(
        `paridade #${idx}: TS ${ts.admitted}/${ts.reason} ≠ SQL ${sqlAdmitted}/${reason}\n    ${JSON.stringify(sc)}`
      );
    }
  }
}
if (diverged > 5) failures.push(`paridade: mais ${diverged - 5} divergência(s) omitida(s)`);

/* Nada pode ter sobrado no banco. */
const leftovers = psql(
  `SELECT count(*) FROM public.alarm_schemes WHERE name LIKE 'gate-%' OR name = 'selftest onda 226'`
);
check('limpeza', leftovers === '0', `${leftovers} linha(s) de teste deixadas no banco`);

if (failures.length > 0) {
  console.error('✗ event-admission');
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(
  `✓ event-admission OK — ACL fechada, ${passed} fronteiras exercidas, ${scenarios.length} cenários de paridade TS↔SQL e banco limpo`
);
