/**
 * Simulação exaustiva — Onda 224 (contagem e filtro do "agora").
 *
 * O que estou tentando quebrar:
 *  - contagem que não fecha (soma dos baldes ≠ total);
 *  - filtro que reordena ou que esconde vigilância real;
 *  - divergência entre o que o contador diz e o que a lista mostra;
 *  - degradado sumindo do total de armados.
 *
 * Rode com: npx tsx scripts/simulate-wave224.ts
 */

import {
  buildArmedRoster,
  countForFilter,
  filterRoster,
  type ArmedFilter,
} from '../src/lib/alarms/armedRoster';
import type { ArmedInput } from '../src/lib/alarms/armedNow';
import { MINUTES_PER_DAY, type AlarmSchedule } from '../src/lib/alarms/alarmAggregation';

let assertions = 0;
const failures: string[] = [];
const assert = (cond: boolean, msg: string) => {
  assertions += 1;
  if (!cond && failures.length < 25) failures.push(msg);
};

let rngState = 20260224;
const rnd = (n: number) => {
  rngState = (rngState * 1664525 + 1013904223) >>> 0;
  return rngState % n;
};

const randomSchedule = (): AlarmSchedule | null => {
  const roll = rnd(8);
  if (roll === 0) return null; // 24×7
  const out: { startMin: number; endMin: number }[][] = [];
  for (let d = 0; d < 7; d += 1) {
    const count = rnd(3);
    const periods: { startMin: number; endMin: number }[] = [];
    for (let i = 0; i < count; i += 1) {
      const start = rnd(MINUTES_PER_DAY);
      const end = (start + 1 + rnd(700)) % MINUTES_PER_DAY;
      if (start !== end) periods.push({ startMin: start, endMin: end });
    }
    out.push(periods);
  }
  return out;
};

const HEALTHS: ArmedInput['health'][] = ['ok', 'inconsistent', 'inoperative'];
const FILTERS: ArmedFilter[] = ['all', 'armed', 'attention', 'off'];
const WEEK_START = Date.UTC(2026, 6, 26, 0, 0);

interface Scheme {
  readonly id: string;
  readonly input: ArmedInput;
}

for (let scenario = 0; scenario < 1200; scenario += 1) {
  const size = rnd(40);
  const items: Scheme[] = [];
  for (let i = 0; i < size; i += 1) {
    items.push({
      id: `s${scenario}-${i}`,
      input: {
        enabled: rnd(5) !== 0,
        health: HEALTHS[rnd(HEALTHS.length)],
        schedule: randomSchedule(),
      },
    });
  }

  // Relógio impossível em parte dos cenários, para exercitar o balde `unknown`.
  const at = rnd(20) === 0 ? Number.NaN : WEEK_START + rnd(7 * MINUTES_PER_DAY) * 60_000;
  const tz = rnd(3) === 0 ? -180 : 0;

  const roster = buildArmedRoster(items, (s) => ({ id: s.id, input: s.input }), at, tz);

  // R2 — partição exata.
  const { counts } = roster;
  const sum = counts.armed + counts.idle + counts.off + counts.inoperative + counts.unknown;
  assert(sum === counts.total, `partição quebrada: ${sum} ≠ ${counts.total}`);
  assert(counts.total === items.length, 'total não bate com a entrada');
  assert(counts.degraded <= counts.armed, 'degradado maior que o total de armados');

  // R1/R3 — "armado" é exatamente quem tem vigilância efetiva.
  const effective = roster.entries.filter((e) => e.verdict.effective).length;
  assert(effective === counts.armed, `efetivos ${effective} ≠ armados ${counts.armed}`);
  const degraded = roster.entries.filter((e) => e.verdict.state === 'armed_degraded').length;
  assert(degraded === counts.degraded, 'contagem de ressalva divergente');

  // Nenhum item nunca é apresentado como armado sem ser efetivo.
  for (const e of roster.entries) {
    assert(
      !(e.verdict.state === 'armed' || e.verdict.state === 'armed_degraded') || e.verdict.effective,
      'estado armado sem efetividade'
    );
    assert(
      e.verdict.state !== 'inoperative' || !e.verdict.effective,
      'inoperante marcado como efetivo'
    );
  }

  const seenIds = new Set<string>();
  for (const e of roster.entries) {
    assert(!seenIds.has(e.id), 'id duplicado no roster');
    seenIds.add(e.id);
  }
  // Ordem de entrada preservada na construção.
  assert(
    roster.entries.every((e, i) => e.id === items[i].id),
    'buildArmedRoster reordenou a entrada'
  );

  for (const filter of FILTERS) {
    const list = filterRoster(roster.entries, filter);

    // R4 — subsequência da ordem original, jamais reordenada.
    let cursor = 0;
    let ordered = true;
    for (const e of list) {
      const idx = roster.entries.findIndex((x, i) => i >= cursor && x.id === e.id);
      if (idx < 0) {
        ordered = false;
        break;
      }
      cursor = idx + 1;
    }
    assert(ordered, `filtro ${filter} reordenou a lista`);

    // Contador e lista contam a mesma coisa.
    assert(countForFilter(roster.entries, filter) === list.length, `contador ${filter} divergente`);

    if (filter === 'all') assert(list.length === counts.total, 'filtro "todos" perdeu itens');
    if (filter === 'armed') {
      assert(list.length === counts.armed, 'filtro "armados" ≠ contador');
      assert(
        list.every((e) => e.verdict.effective),
        'filtro "armados" trouxe item sem vigilância'
      );
    }
    if (filter === 'attention') {
      // Nada inoperante pode escapar do balde de atenção.
      const inoperatives = roster.entries.filter((e) => e.verdict.state === 'inoperative');
      assert(
        inoperatives.every((e) => list.some((x) => x.id === e.id)),
        'inoperante escapou do filtro de atenção'
      );
      const degradedEntries = roster.entries.filter((e) => e.verdict.state === 'armed_degraded');
      assert(
        degradedEntries.every((e) => list.some((x) => x.id === e.id)),
        'degradado escapou do filtro de atenção'
      );
    }
    if (filter === 'off') {
      assert(
        list.every((e) => !e.verdict.effective),
        'filtro "sem vigilância" trouxe esquema armado'
      );
    }
  }

  // Cobertura conjunta: todo item aparece em ao menos um filtro concreto.
  const covered = new Set<string>();
  for (const f of ['armed', 'attention', 'off'] as ArmedFilter[]) {
    for (const e of filterRoster(roster.entries, f)) covered.add(e.id);
  }
  assert(covered.size === counts.total, 'existe esquema invisível em todos os filtros');
}

// Lista vazia não explode e devolve zeros coerentes.
const empty = buildArmedRoster<Scheme>([], (s) => ({ id: s.id, input: s.input }), Date.now());
assert(empty.counts.total === 0 && empty.entries.length === 0, 'roster vazio inconsistente');
for (const f of FILTERS) assert(filterRoster(empty.entries, f).length === 0, 'filtro vazio errado');

if (failures.length > 0) {
  console.log(`✗ Onda 224 — ${failures.length} falha(s) em ${assertions} asserções\n`);
  for (const f of failures) console.log(`  ${f}`);
  process.exit(1);
}
console.log(`✓ Onda 224 — ${assertions} asserções, nenhuma falha`);
