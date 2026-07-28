/**
 * Gate de CI — Onda 225: espelho SQL do veredito "está armado agora?".
 *
 * Por que este gate é escrito em TypeScript (e não .mjs como os demais): ele
 * precisa executar a régua real (`evaluateArmedNow`) e confrontá-la, caso a
 * caso, com a função do banco. Comparar SQL contra uma reimplementação em
 * JavaScript escrita dentro do gate provaria apenas que o gate concorda
 * consigo mesmo.
 *
 * O que é provado:
 *  1. As duas funções existem, são IMMUTABLE e têm `search_path` fixo.
 *  2. `anon` não executa o autoteste (SECURITY DEFINER exposto seria brecha).
 *  3. As 17 fronteiras do autoteste passam **executando de fato** — gate
 *     estático não prova execução (lição da Onda 141).
 *  4. Paridade TS ↔ SQL em centenas de combinações aleatórias de agenda,
 *     saúde, habilitação, instante e fuso. Se divergirem, o motor dispara
 *     fora da janela enquanto a tela diz "fora da janela".
 *
 * Rode com: npm run db:check:armed-now
 */

import { execFileSync } from 'node:child_process';
import { evaluateArmedNow, type ArmedInput } from '../src/lib/alarms/armedNow';
import { MINUTES_PER_DAY, type AlarmSchedule } from '../src/lib/alarms/alarmAggregation';

const failures: string[] = [];
const query = (sql: string) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
const check = (label: string, cond: boolean, detail: string) => {
  if (!cond) failures.push(`${label}: ${detail}`);
};

// 1 — assinatura, volatilidade e search_path.
for (const fn of ['alarm_scheme_armed_state', 'alarm_scheme_is_armed']) {
  const meta = query(
    `SELECT p.provolatile || '|' || coalesce(array_to_string(p.proconfig, ','), '')
       FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = '${fn}'`,
  );
  check(fn, meta.startsWith('i'), `precisa ser IMMUTABLE (volatilidade: ${meta || 'ausente'})`);
  check(fn, meta.includes('search_path=public'), 'precisa fixar search_path=public');
}

// 2 — o autoteste SECURITY DEFINER não pode ser público.
for (const role of ['anon', 'authenticated']) {
  const can = query(
    `SELECT has_function_privilege('${role}', 'public.alarm_armed_state_selftest()', 'execute')`,
  );
  check('acl', can === 'f', `${role} não pode executar alarm_armed_state_selftest()`);
}

// 3 — exercício dinâmico das fronteiras.
const bad = query(
  `SELECT coalesce(string_agg(case_name || ' (esperado ' || expected || ', obtido ' || coalesce(actual,'∅') || ')', '; '), '')
     FROM public.alarm_armed_state_selftest() WHERE NOT ok`,
);
check('selftest', bad === '', bad);
const passed = Number(query('SELECT count(*) FROM public.alarm_armed_state_selftest() WHERE ok'));
check('selftest', passed >= 17, `apenas ${passed} fronteiras exercidas`);

// 4 — paridade TS ↔ SQL.
let rngState = 20260225;
const rnd = (n: number) => {
  rngState = (rngState * 1664525 + 1013904223) >>> 0;
  return rngState % n;
};

const randomSchedule = (): AlarmSchedule | null => {
  const roll = rnd(7);
  if (roll === 0) return null;
  const out: { startMin: number; endMin: number }[][] = [];
  for (let d = 0; d < 7; d += 1) {
    const count = rnd(3);
    const periods: { startMin: number; endMin: number }[] = [];
    for (let i = 0; i < count; i += 1) {
      const start = rnd(MINUTES_PER_DAY);
      const end = (start + 1 + rnd(800)) % MINUTES_PER_DAY;
      if (start !== end) periods.push({ startMin: start, endMin: end });
    }
    out.push(periods);
  }
  return out;
};

const HEALTHS: ArmedInput['health'][] = ['ok', 'inconsistent', 'inoperative'];
const WEEK_START = Date.UTC(2026, 6, 26, 0, 0);

interface Probe {
  readonly sql: string;
  readonly expected: string;
  readonly label: string;
}

const probes: Probe[] = [];
for (let i = 0; i < 600; i += 1) {
  const schedule = randomSchedule();
  const input: ArmedInput = {
    enabled: rnd(6) !== 0,
    health: HEALTHS[rnd(HEALTHS.length)],
    schedule,
  };
  const at = WEEK_START + rnd(7 * MINUTES_PER_DAY) * 60_000;
  const tz = [0, -180, -120, 330, -720][rnd(5)];

  const expected = evaluateArmedNow(input, at, tz).state;
  const scheduleLiteral =
    schedule === null ? 'NULL::jsonb' : `'${JSON.stringify(schedule).replace(/'/g, "''")}'::jsonb`;
  probes.push({
    label: `#${i} tz=${tz}`,
    expected,
    sql: `public.alarm_scheme_armed_state(${scheduleLiteral}, ${input.enabled}, '${input.health}', '${new Date(at).toISOString()}'::timestamptz, ${tz})`,
  });
}

// Um único round-trip: 600 psql seriam lentos e mascarariam o custo real.
const unionSql = probes
  .map((p, i) => `SELECT ${i} AS i, ${p.sql} AS actual`)
  .join(' UNION ALL ');
const rows = query(`SELECT i || '|' || actual FROM (${unionSql}) t ORDER BY i`)
  .split('\n')
  .filter(Boolean);

check('paridade', rows.length === probes.length, `${rows.length} respostas para ${probes.length} sondas`);
let diverged = 0;
for (const line of rows) {
  const [idx, actual] = line.split('|');
  const probe = probes[Number(idx)];
  if (!probe) continue;
  if (actual !== probe.expected) {
    diverged += 1;
    if (diverged <= 5) {
      failures.push(
        `paridade ${probe.label}: TS diz "${probe.expected}", SQL diz "${actual}"\n    ${probe.sql}`,
      );
    }
  }
}
if (diverged > 5) failures.push(`paridade: mais ${diverged - 5} divergência(s) omitida(s)`);

if (failures.length > 0) {
  console.error('✗ armed-now');
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(
  `✓ armed-now OK — espelho IMMUTABLE, ACL fechada, ${passed} fronteiras exercidas e ${probes.length} sondas de paridade TS↔SQL`,
);
