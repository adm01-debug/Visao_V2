/**
 * Onda 231 — simulação exaustiva da leitura desconfiada do histórico de expurgo.
 *
 * Executa dezenas de milhares de cenários pseudo-aleatórios determinísticos
 * (LCG com semente fixa) e confere as leis H1–H8 em cada retrato produzido.
 *
 *   npx tsx scripts/simulate-wave231-purge-history.ts
 */

import {
  LATE_FACTOR,
  PURGE_CADENCE_MINUTES,
  STALLED_FACTOR,
  TREND_WINDOW,
  purgeHealthSeverity,
  readPurgeHistory,
  readPurgeRun,
  type PurgeHealth,
  type RawPurgeRunRow,
} from '../src/lib/alarms/admissionPurgeHistory';

let seed = 0x9e3779b9;
function rnd(): number {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x1_0000_0000;
}
function pick<T>(xs: readonly T[]): T {
  return xs[Math.floor(rnd() * xs.length)] as T;
}
function int(min: number, max: number): number {
  return min + Math.floor(rnd() * (max - min + 1));
}

let assertions = 0;
let failures = 0;
function check(label: string, ok: boolean): void {
  assertions += 1;
  if (!ok) {
    failures += 1;
    if (failures <= 20) console.error(`✗ ${label}`);
  }
}

const NOW = Date.parse('2026-07-28T12:00:00.000Z');
const MIN = 60_000;

type Mode = 'clean' | 'unreadable' | 'inconsistent' | 'bigint_text' | 'null_row';

function makeRow(mode: Mode, executedAt: number, deferred: number): RawPurgeRunRow {
  const batchCap = int(1, 50_000);
  const deleted = int(0, batchCap);
  const capped = deferred > 0;
  const base: Record<string, unknown> = {
    id: `run-${int(100000, 999999)}`,
    executed_at: new Date(executedAt).toISOString(),
    cutoff_at: new Date(executedAt - int(1, 400) * 86_400_000).toISOString(),
    retention_days: 365,
    batch_cap: batchCap,
    deleted_count: deleted,
    deferred_count: deferred,
    quarantined_count: int(0, 50),
    capped,
    duration_ms: int(0, 60_000),
  };

  switch (mode) {
    case 'bigint_text':
      base.deleted_count = String(deleted);
      base.deferred_count = String(deferred);
      base.quarantined_count = String(base.quarantined_count);
      return base;
    case 'unreadable':
      base[pick(['executed_at', 'deleted_count', 'batch_cap', 'retention_days', 'capped'])] = pick([
        null,
        undefined,
        'abc',
        -1,
        NaN,
      ]);
      return base;
    case 'inconsistent':
      if (rnd() < 0.5) base.capped = !capped;
      else base.deleted_count = batchCap + int(1, 100);
      return base;
    case 'null_row':
      return {};
    default:
      return base;
  }
}

console.log('▶ Onda 231 — simulação do histórico de expurgo do livro de admissão');

// ── Bloco 1: leitura de linha isolada ────────────────────────────────────────
for (let i = 0; i < 30_000; i += 1) {
  const mode = pick<Mode>(['clean', 'unreadable', 'inconsistent', 'bigint_text', 'null_row']);
  const deferred = rnd() < 0.4 ? int(1, 5_000) : 0;
  const row = readPurgeRun(makeRow(mode, NOW - int(0, 400) * 60 * MIN, deferred), i);

  check('H1 status é um dos três', ['valid', 'inconsistent', 'unreadable'].includes(row.status));
  check('H1 válida não tem motivo', row.status !== 'valid' || row.reason === null);
  check('H1 não-válida tem motivo', row.status === 'valid' || typeof row.reason === 'string');
  check('H1 id sempre presente', row.id.length > 0);
  if (row.status === 'valid') {
    check('H4 espelho de teto vale', row.capped === row.deferred! > 0);
    check('H4 apagadas dentro do teto', row.deleted! <= row.batchCap!);
    check('H1 contadores não-negativos', row.deleted! >= 0 && row.deferred! >= 0);
    check('H1 relógio legível', row.executedAt !== null);
  }
  if (mode === 'clean' || mode === 'bigint_text') {
    check('bigint textual é legível como número', row.status === 'valid');
  }
  if (mode === 'null_row') {
    check('linha vazia nunca é válida', row.status === 'unreadable');
  }
}

// ── Bloco 2: retrato do histórico ────────────────────────────────────────────
for (let i = 0; i < 25_000; i += 1) {
  const n = int(0, 12);
  const ageMinutes = int(0, PURGE_CADENCE_MINUTES * 8);
  const rows: RawPurgeRunRow[] = [];
  let poisoned = false;
  for (let k = 0; k < n; k += 1) {
    const mode = pick<Mode>([
      'clean',
      'clean',
      'clean',
      'unreadable',
      'inconsistent',
      'bigint_text',
    ]);
    if (mode === 'unreadable' || mode === 'inconsistent') poisoned = true;
    rows.push(
      makeRow(
        mode,
        NOW - (ageMinutes + k * PURGE_CADENCE_MINUTES) * MIN,
        rnd() < 0.35 ? int(1, 9_000) : 0
      )
    );
  }

  const snap = readPurgeHistory(rows, { now: NOW });

  check('H7 total confere', snap.totalRows === n);
  check(
    'H7 partição fechada',
    snap.validRows + snap.inconsistentRows + snap.unreadableRows === snap.totalRows
  );
  // H7 — ordem determinística e estável
  for (let k = 1; k < snap.rows.length; k += 1) {
    const prev = snap.rows[k - 1]!.executedAt;
    const curr = snap.rows[k]!.executedAt;
    if (prev !== null && curr !== null) check('H7 ordem desc por relógio', prev >= curr);
    if (prev === null) check('H7 ilegível sem relógio no fim', curr === null);
  }

  // H2 — ausência nunca é "em dia"
  if (snap.validRows === 0) {
    check('H2 sem execução válida nunca é ok', snap.health !== 'ok');
    check(
      'H2 vazio é never_ran, sujo é contested',
      n === 0 ? snap.health === 'never_ran' : snap.health === 'contested'
    );
    check('H2 sem execução não tem horas', snap.hoursSinceLast === null);
  }

  // H3 — escada de pontualidade
  if (snap.lastValid?.executedAt !== null && snap.lastValid?.executedAt !== undefined) {
    const elapsed = (NOW - snap.lastValid.executedAt) / MIN;
    if (elapsed > PURGE_CADENCE_MINUTES * STALLED_FACTOR) {
      check('H3 parada domina', snap.health === 'stalled');
    } else if (elapsed > PURGE_CADENCE_MINUTES * LATE_FACTOR) {
      check('H3 atrasada', snap.health === 'late');
    } else {
      check('H3 pontual nunca é late/stalled', !['late', 'stalled'].includes(snap.health));
    }
    check('H3 horas coerentes', Math.abs(snap.hoursSinceLast! - elapsed / 60) < 1e-6);
  }

  // H5 — passivo é eixo separado
  check('H5 passivo espelha última válida', snap.deferredNow === (snap.lastValid?.deferred ?? 0));
  const punctual = !['late', 'stalled', 'never_ran', 'unknown'].includes(snap.health);
  if (punctual && snap.deferredNow > 0) {
    check('H5 pontual com passivo nunca é ok', snap.health !== 'ok');
    check('H5 passivo classifica', snap.health === 'backlog' || snap.health === 'backlog_growing');
  }

  // H4 — trilha suja rebaixa retrato pontual sem passivo
  if (punctual && snap.deferredNow === 0 && poisoned && snap.validRows > 0) {
    check('H4 trilha suja contesta', snap.health !== 'ok');
  }
  if (snap.health === 'ok') {
    check('H4 ok exige trilha limpa', snap.inconsistentRows === 0 && snap.unreadableRows === 0);
    check('H4 ok exige passivo zero', snap.deferredNow === 0);
  }

  // H8 — quarentena sempre no retrato
  check(
    'H8 quarentena numérica',
    Number.isInteger(snap.quarantinedNow) && snap.quarantinedNow >= 0
  );
  check('H8 apagadas acumuladas não-negativas', snap.deletedWindow >= 0);
  check('H6 tendência é booleana', typeof snap.backlogGrowing === 'boolean');
  if (snap.validRows < 2) check('H6 amostra curta nunca cresce', snap.backlogGrowing === false);
  check('rótulo sempre presente', snap.label.length > 0);
  check('severidade definida', Number.isInteger(purgeHealthSeverity(snap.health)));
}

// ── Bloco 3: relógio hostil e determinismo ───────────────────────────────────
const HOSTILE_NOW: unknown[] = [NaN, Infinity, -Infinity, 'ontem', null, undefined, {}, []];
for (let i = 0; i < 8_000; i += 1) {
  const rows = [makeRow('clean', NOW - int(0, 100) * MIN, int(0, 100))];
  const bad = HOSTILE_NOW[i % HOSTILE_NOW.length];
  const snap = readPurgeHistory(rows, { now: bad as number });
  check('H2 relógio ilegível nunca é ok', snap.health === 'unknown');
  check('H2 relógio ilegível sem horas', snap.hoursSinceLast === null);

  // relógio retrocedido não autoriza veredito
  const future = readPurgeHistory(rows, { now: NOW - 10 * 86_400_000 });
  check('relógio retrocedido é indeterminado', future.health === 'unknown');

  // determinismo: mesma entrada, mesmo retrato
  const a = readPurgeHistory(rows, { now: NOW });
  const b = readPurgeHistory(rows, { now: NOW });
  check('determinismo do retrato', JSON.stringify(a) === JSON.stringify(b));
}

// ── Bloco 4: tendência de passivo (H6) ───────────────────────────────────────
function trendSnapshot(deferreds: readonly number[]): PurgeHealth {
  const rows = deferreds.map((d, k) => makeRow('clean', NOW - k * PURGE_CADENCE_MINUTES * MIN, d));
  return readPurgeHistory(rows, { now: NOW }).health;
}
for (let i = 0; i < 5_000; i += 1) {
  const a = int(1, 100);
  const b = a + int(1, 100);
  const c = b + int(1, 100);
  // mais recente primeiro: c > b > a ⇒ passivo crescendo
  check('H6 passivo crescente detectado', trendSnapshot([c, b, a]) === 'backlog_growing');
  check('H6 passivo decrescente só é backlog', trendSnapshot([a, b, c]) === 'backlog');
  check('H6 passivo estável só é backlog', trendSnapshot([a, a, a]) === 'backlog');
  check('H6 sem passivo, sem alerta', trendSnapshot([0, 0, 0]) === 'ok');
  check('H6 janela declarada', TREND_WINDOW >= 2);
}

console.log(`\n✔ asserções: ${assertions.toLocaleString('pt-BR')}`);
if (failures > 0) {
  console.error(`✗ falhas: ${failures}`);
  process.exit(1);
}
console.log('✔ Onda 231 — todas as leis H1–H8 verificadas');
