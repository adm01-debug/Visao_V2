#!/usr/bin/env node
/**
 * Onda 170 — simulação da durabilidade da passagem de turno.
 *
 * Exercita `src/lib/emap/shiftJournalStore.ts` contra as seis regras do módulo:
 * envelope inválido descarta tudo, registro inválido morre sozinho, relógio
 * futuro é suspeito, turno expira sem apagar pendência, idade nunca é
 * reconstruída e a carga sempre informa o desfecho.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'wave170-'));
const entry = join(dir, 'entry.mjs');
writeFileSync(
  entry,
  `export * from '${join(process.cwd(), 'src/lib/emap/shiftJournalStore.ts')}';\n`
);

const bundle = join(dir, 'bundle.mjs');
execFileSync(
  'npx',
  ['esbuild', entry, '--bundle', '--format=esm', '--platform=node', `--outfile=${bundle}`],
  {
    stdio: 'inherit',
  }
);

const store = await import(bundle);

let assertions = 0;
let failures = 0;
const check = (label, condition) => {
  assertions += 1;
  if (!condition) {
    failures += 1;
    if (failures <= 20) console.error(`FALHA: ${label}`);
  }
};

const NOW = 1_700_000_000_000;
const HOUR = 3_600_000;

const mkEntry = (id, openedAt, status = 'offline') => ({
  cameraId: id,
  status,
  worst: status,
  since: openedAt,
  openedAt,
  lastSeen: openedAt,
  changes: 0,
});

const mkClosure = (id, openedAt, closedAt, reason = 'normalized') => ({
  cameraId: id,
  status: 'online',
  worst: 'offline',
  openedAt,
  closedAt,
  changes: 1,
  reason,
});

const baseState = (startedAt, entries, closures) => ({
  journal: {
    startedAt,
    closures,
    totals: { normalized: closures.length, acknowledged: 0, removed: 0 },
    dropped: 0,
  },
  ledger: Object.fromEntries(entries.map((e) => [e.cameraId, e])),
});

// 1. Ida e volta preserva instantes absolutos (regra 5).
for (let i = 0; i < 400; i += 1) {
  const openedAt = NOW - (i + 1) * 60_000;
  const state = baseState(
    NOW - HOUR,
    [mkEntry(`cam-${i}`, openedAt)],
    [mkClosure(`old-${i}`, openedAt, openedAt + 1000)]
  );
  const raw = store.serializeShiftState(state, NOW - 1000);
  const result = store.parseShiftState(raw, NOW);
  check('roundtrip restaurado', result.outcome === 'restored');
  check('openedAt intacto', result.state.ledger[`cam-${i}`].openedAt === openedAt);
  check('journal preservado', result.state.journal.startedAt === NOW - HOUR);
  check('fechamento preservado', result.state.journal.closures.length === 1);
  check('sem descarte', result.discardedEntries === 0);
}

// 2. Envelope inválido descarta tudo (regra 1).
const badEnvelopes = [
  '',
  '   ',
  'não é json',
  '[]',
  '{}',
  JSON.stringify({ v: 999, savedAt: NOW, journal: {}, ledger: {} }),
  JSON.stringify({ v: 1, savedAt: 'ontem', journal: {}, ledger: {} }),
  JSON.stringify({ v: 1, savedAt: NOW, journal: null, ledger: {} }),
  JSON.stringify({ v: 1, savedAt: NOW, journal: {}, ledger: null }),
  JSON.stringify({
    v: 1,
    savedAt: NOW,
    journal: { startedAt: NOW, closures: 'x', totals: {}, dropped: 0 },
    ledger: {},
  }),
  JSON.stringify({
    v: 1,
    savedAt: NOW,
    journal: {
      startedAt: NOW,
      closures: [],
      totals: { normalized: -1, acknowledged: 0, removed: 0 },
      dropped: 0,
    },
    ledger: {},
  }),
];
for (const raw of badEnvelopes) {
  const result = store.parseShiftState(raw, NOW);
  const expected = raw.trim().length === 0 ? 'empty' : 'corrupt';
  check(`envelope inválido → ${expected}`, result.outcome === expected);
  check('estado limpo', Object.keys(result.state.ledger).length === 0);
  check('turno novo', result.state.journal.startedAt === NOW);
  check('nada carregado', result.carried.length === 0);
}
check('nulo é vazio', store.parseShiftState(null, NOW).outcome === 'empty');
check('undefined é vazio', store.parseShiftState(undefined, NOW).outcome === 'empty');

// 3. Registro corrompido morre sozinho (regra 2).
for (let i = 0; i < 200; i += 1) {
  const good = mkEntry(`ok-${i}`, NOW - 5000);
  const state = baseState(NOW - HOUR, [good], []);
  const parsedRaw = JSON.parse(store.serializeShiftState(state, NOW - 10));
  parsedRaw.ledger['ruim'] = { cameraId: 'outro-id', status: 'zumbi', since: 'x' };
  parsedRaw.ledger['ruim2'] = null;
  parsedRaw.journal.closures.push({ cameraId: 'x', reason: 'inventado' });
  const result = store.parseShiftState(JSON.stringify(parsedRaw), NOW);
  check('envelope válido sobrevive', result.outcome === 'restored');
  check('bom preservado', Boolean(result.state.ledger[`ok-${i}`]));
  check('ruim descartado', !result.state.ledger['ruim'] && !result.state.ledger['ruim2']);
  check('fechamento inválido descartado', result.state.journal.closures.length === 0);
  check('descarte contabilizado', result.discardedEntries === 3);
}

// 4. Relógio futuro é suspeito (regra 3).
for (let i = 0; i < 200; i += 1) {
  const skew = 6 * 60_000 + i * 1000;
  const state = baseState(NOW - HOUR, [mkEntry(`c-${i}`, NOW - HOUR)], []);
  const raw = store.serializeShiftState(state, NOW + skew);
  const result = store.parseShiftState(raw, NOW);
  check('futuro descartado', result.outcome === 'clock_suspect');
  check('nada restaurado', Object.keys(result.state.ledger).length === 0);
}
// Dentro da tolerância continua valendo.
for (let i = 0; i < 100; i += 1) {
  const state = baseState(NOW - HOUR, [mkEntry(`t-${i}`, NOW - HOUR)], []);
  const raw = store.serializeShiftState(state, NOW + i * 1000);
  const result = store.parseShiftState(raw, NOW);
  check('skew tolerado', result.outcome === 'restored');
}

// 5. Turno expira, pendência sobrevive (regra 4).
for (let i = 0; i < 300; i += 1) {
  const age = 12 * HOUR + i * 60_000;
  const openedAt = NOW - age - 1000;
  const state = baseState(
    NOW - age,
    [mkEntry(`p-${i}`, openedAt)],
    [mkClosure(`f-${i}`, openedAt, openedAt + 10)]
  );
  const raw = store.serializeShiftState(state, NOW - 1000);
  const result = store.parseShiftState(raw, NOW);
  check('turno rolou', result.outcome === 'rolled_over');
  check('turno novo começa agora', result.state.journal.startedAt === NOW);
  check('contadores zerados', result.state.journal.totals.normalized === 0);
  check('pendência preservada', result.state.ledger[`p-${i}`].openedAt === openedAt);
  check('história entregue', result.carried.length === 1);
}

// 6. Teto de fechamentos: detalhe corta, contagem não mente.
{
  const closures = Array.from({ length: 300 }, (_, i) =>
    mkClosure(`z-${i}`, NOW - HOUR, NOW - HOUR + i)
  );
  const state = baseState(NOW - HOUR, [], closures);
  const raw = store.serializeShiftState(state, NOW - 1);
  const result = store.parseShiftState(raw, NOW);
  check('teto aplicado', result.state.journal.closures.length === 120);
  check('excedente contabilizado', result.state.journal.dropped === 180);
  check('totais intactos', result.state.journal.totals.normalized === 300);
  const ordered = result.state.journal.closures.every(
    (c, idx, arr) => idx === 0 || arr[idx - 1].closedAt >= c.closedAt
  );
  check('ordem mais recente primeiro', ordered);
}

// 7. Teto de entradas do relógio.
{
  const entries = Array.from({ length: 700 }, (_, i) => mkEntry(`m-${i}`, NOW - 1000));
  const state = baseState(NOW - HOUR, entries, []);
  const result = store.parseShiftState(store.serializeShiftState(state, NOW - 1), NOW);
  check('teto do relógio', Object.keys(result.state.ledger).length === 500);
  check('excedente reportado', result.discardedEntries === 200);
}

// 8. Adaptador de armazenamento nunca lança.
{
  const explosive = {
    getItem() {
      throw new Error('bloqueado');
    },
    setItem() {
      throw new Error('cota');
    },
    removeItem() {
      throw new Error('nope');
    },
  };
  check('leitura blindada', store.readShiftState(explosive, NOW).outcome === 'empty');
  check(
    'escrita blindada',
    store.writeShiftState(explosive, baseState(NOW, [], []), NOW) === false
  );
  store.clearShiftState(explosive);
  check('limpeza blindada', true);
  check('storage nulo', store.readShiftState(null, NOW).outcome === 'empty');
  check('escrita sem storage', store.writeShiftState(null, baseState(NOW, [], []), NOW) === false);

  const map = new Map();
  const mem = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
  const state = baseState(NOW - HOUR, [mkEntry('cam-a', NOW - HOUR)], []);
  check('gravou', store.writeShiftState(mem, state, NOW) === true);
  const back = store.readShiftState(mem, NOW);
  check('leu de volta', back.outcome === 'restored' && Boolean(back.state.ledger['cam-a']));
  store.clearShiftState(mem);
  check('limpou', store.readShiftState(mem, NOW).outcome === 'empty');
}

// 9. Pureza: parse não muta o argumento e é determinístico.
for (let i = 0; i < 200; i += 1) {
  const state = baseState(
    NOW - HOUR,
    [mkEntry(`d-${i}`, NOW - HOUR)],
    [mkClosure(`e-${i}`, NOW - HOUR, NOW - 10)]
  );
  const raw = store.serializeShiftState(state, NOW - 5);
  const before = raw;
  const a = store.parseShiftState(raw, NOW);
  const b = store.parseShiftState(raw, NOW);
  check('texto intacto', raw === before);
  check('determinístico', JSON.stringify(a.state) === JSON.stringify(b.state));
  check('sem relógio próprio', a.state.journal.startedAt === NOW - HOUR);
}

// 10. `now` inválido nunca fabrica NaN.
for (const bad of [NaN, Infinity, -Infinity, undefined, null, 'agora']) {
  const result = store.parseShiftState(null, bad);
  check('now inválido vira 0', result.state.journal.startedAt === 0);
  check('estado vazio', Object.keys(result.state.ledger).length === 0);
}

console.log(`Onda 170 — ${assertions} asserções, ${failures} falha(s).`);
process.exit(failures === 0 ? 0 : 1);
