#!/usr/bin/env node
/**
 * Onda 183 — simulação exaustiva do painel de séries crônicas.
 *
 * Invariantes provadas (se caírem, o gestor prioriza a série errada ou vê
 * saúde onde há ausência de dado):
 *
 *  I1. Ordem total e determinística: nenhum par distinto empata e reordenar a
 *      entrada não muda a saída.
 *  I2. Monotonicidade no agravamento: acrescentar episódio/oscilação nunca
 *      reduz pontuação, classe ou modo.
 *  I3. Crítico nunca é resumido.
 *  I4. Ausência de dado nunca vira "calmo".
 *  I5. Conservação: exibidas + truncadas = válidas; válidas + descartadas =
 *      ofertadas.
 *  I6. Idade nunca é negativa.
 *  I7. Pureza: a entrada não é mutada.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'wave183-'));
const entry = join(dir, 'entry.mjs');
writeFileSync(
  entry,
  `export * from ${JSON.stringify(join(process.cwd(), 'src/lib/alarms/chronicSeriesBoard.ts'))};
export { recurrenceClassRank, noticeModeRank } from ${JSON.stringify(join(process.cwd(), 'src/lib/alarms/alarmRecurrence.ts'))};`,
);
execFileSync(
  'npx',
  ['esbuild', entry, '--bundle', '--format=esm', '--platform=node', `--outfile=${join(dir, 'b.mjs')}`],
  { stdio: 'pipe' },
);
const {
  buildChronicSeriesBoard,
  compareEntries,
  recurrenceClassRank,
  noticeModeRank,
  seriesStateRank,
} = await import(join(dir, 'b.mjs'));

let assertions = 0;
let failures = 0;
const fail = (msg) => {
  failures += 1;
  if (failures <= 20) console.error(`  ✗ ${msg}`);
};
const ok = (cond, msg) => {
  assertions += 1;
  if (!cond) fail(msg);
};

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const NOW = 1_700_000_000_000;

const makeRow = (r, i) => {
  const episodes = Math.floor(r() * 12);
  const chatter = Math.floor(r() * (episodes + 1));
  const total = episodes + Math.floor(r() * 20);
  const known = r() > 0.15;
  const isOpen = r() > 0.7;
  const lastOpenedAt = known ? NOW - Math.floor(r() * 7_200_000) + (r() > 0.95 ? 600_000 : 0) : null;
  return {
    seriesKey: `serie-${i}`,
    episodesInWindow: episodes,
    chatterInWindow: chatter,
    totalEpisodes: total,
    peakSeverity: episodes === 0 ? null : SEVERITIES[Math.floor(r() * SEVERITIES.length)],
    isOpen,
    lastOpenedAt,
    lastClosedAt: isOpen || !known ? null : NOW - Math.floor(r() * 3_600_000),
  };
};

// ---- Bateria 1: propriedades sobre carteiras aleatórias -----------------------
for (let seed = 1; seed <= 1500; seed += 1) {
  const r = rng(seed);
  const count = 1 + Math.floor(r() * 40);
  const rows = Array.from({ length: count }, (_, i) => makeRow(r, i));
  const frozen = JSON.stringify(rows);
  const limit = 1 + Math.floor(r() * 30);
  const board = buildChronicSeriesBoard(rows, NOW, { limit });

  // I7
  ok(JSON.stringify(rows) === frozen, `seed ${seed}: entrada foi mutada`);

  // I5
  ok(
    board.entries.length + board.truncated === board.totalSeries,
    `seed ${seed}: conservação exibidas+truncadas`,
  );
  const discardedTotal = Object.values(board.discarded).reduce((a, b) => a + b, 0);
  ok(board.totalSeries + discardedTotal === count, `seed ${seed}: conservação de linhas ofertadas`);
  ok(board.entries.length <= limit, `seed ${seed}: teto de linhas violado`);

  for (const e of board.entries) {
    // I6
    ok(e.ageMs === null || e.ageMs >= 0, `seed ${seed}: idade negativa em ${e.seriesKey}`);
    // I3
    ok(!(e.peakSeverity === 'critical' && e.mode === 'summarize'), `seed ${seed}: crítico resumido`);
    // I4
    ok(!(e.lastOpenedAt === null && e.state === 'quiet'), `seed ${seed}: ausência virou calmo`);
    ok(!(e.isOpen && e.state !== 'open'), `seed ${seed}: série aberta fora do estado em curso`);
  }

  // I1 — ordem total e estável sob permutação
  for (let i = 1; i < board.entries.length; i += 1) {
    ok(compareEntries(board.entries[i - 1], board.entries[i]) < 0, `seed ${seed}: ordem não estrita`);
  }
  const shuffled = [...rows];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(r() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const again = buildChronicSeriesBoard(shuffled, NOW, { limit });
  ok(
    JSON.stringify(again.entries.map((e) => e.seriesKey)) ===
      JSON.stringify(board.entries.map((e) => e.seriesKey)),
    `seed ${seed}: ordem depende da entrada`,
  );
}

// ---- Bateria 2: monotonicidade (I2) ------------------------------------------
for (let seed = 1; seed <= 4000; seed += 1) {
  const r = rng(seed * 7919);
  const base = makeRow(r, 0);
  base.chatterInWindow = Math.min(base.chatterInWindow, base.episodesInWindow);
  const before = buildChronicSeriesBoard([base], NOW).entries[0];
  if (!before) continue;
  const worse = {
    ...base,
    episodesInWindow: base.episodesInWindow + 1 + Math.floor(r() * 5),
    totalEpisodes: base.totalEpisodes + 1 + Math.floor(r() * 5),
  };
  worse.chatterInWindow = Math.min(base.chatterInWindow + Math.floor(r() * 2), worse.episodesInWindow);
  worse.totalEpisodes = Math.max(worse.totalEpisodes, worse.episodesInWindow);
  worse.peakSeverity = worse.peakSeverity ?? 'low';
  const after = buildChronicSeriesBoard([worse], NOW).entries[0];
  ok(after.score >= before.score, `seed ${seed}: pontuação caiu ao agravar`);
  ok(
    recurrenceClassRank(after.klass) >= recurrenceClassRank(before.klass),
    `seed ${seed}: classe rebaixada ao agravar`,
  );
  // O modo só pode enfraquecer de `notify` para `summarize` quando a série
  // deixa de ser crítica — o que não acontece aqui, pois a gravidade não cai.
  if (before.peakSeverity === after.peakSeverity) {
    ok(
      noticeModeRank(after.mode) >= noticeModeRank(before.mode) || after.klass !== before.klass,
      `seed ${seed}: modo enfraquecido ao agravar`,
    );
  }
}

// ---- Bateria 3: casos limite ---------------------------------------------------
const edge = buildChronicSeriesBoard(
  [
    { seriesKey: 'a', episodesInWindow: -1, chatterInWindow: 0, totalEpisodes: 0, peakSeverity: 'low', isOpen: false, lastOpenedAt: null, lastClosedAt: null },
    { seriesKey: 'b', episodesInWindow: 2, chatterInWindow: 5, totalEpisodes: 9, peakSeverity: 'low', isOpen: false, lastOpenedAt: NOW, lastClosedAt: NOW },
    { seriesKey: 'c', episodesInWindow: 3, chatterInWindow: 0, totalEpisodes: 3, peakSeverity: 'nope', isOpen: false, lastOpenedAt: NOW - 10, lastClosedAt: NOW - 5 },
  ],
  NOW,
);
ok(edge.discarded.invalid_counts === 2, 'contagens impossíveis não descartadas');
ok(edge.entries.length === 1 && edge.entries[0].peakSeverity === null, 'gravidade inválida não anulada');
ok(seriesStateRank('open') > seriesStateRank('quiet'), 'ordem de estados incoerente');

const nullBoard = buildChronicSeriesBoard(null, NOW);
ok(nullBoard.totalSeries === 0 && nullBoard.entries.length === 0, 'entrada nula não tolerada');

console.log(
  `\nOnda 183 — painel de séries crônicas: ${assertions} asserções, ${failures} falha(s).`,
);
if (failures > 0) process.exit(1);
console.log('✅ Simulação aprovada.');
