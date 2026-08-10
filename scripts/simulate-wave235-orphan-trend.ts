/**
 * Onda 235 — Simulação exaustiva da tendência do órfão (leis L1–L8).
 *
 * Não é "teste de exemplo": varre o espaço de séries curtas por força bruta,
 * embaralha ordens de chegada, injeta linhas ilegíveis e confere invariantes
 * que nenhum caso feliz revelaria.
 */
import {
  PERSIST_SAMPLES,
  assessOrphanTrend,
  assessOrphanTrendFromRows,
  classifyOrphanSeries,
  readReconcileSnapshot,
  renderTrendReason,
  severityForTrend,
  type OrphanTrendVerdict,
  type RawReconcileSnapshotRow,
} from '../src/lib/alarms/admissionOrphanTrend.ts';

let assertions = 0;
const failures: string[] = [];

function check(cond: boolean, msg: string): void {
  assertions += 1;
  if (!cond) failures.push(msg);
}

const BASE = Date.parse('2026-07-01T03:53:00.000Z');

function rows(series: readonly number[]): RawReconcileSnapshotRow[] {
  // Mais antigo primeiro na série → observed_at crescente.
  return series.map((orphan, i) => ({
    id: i + 1,
    observed_at: new Date(BASE + i * 86_400_000).toISOString(),
    verdict: orphan > 0 ? 'unaccounted' : 'reconciled',
    orphan_count: String(orphan),
    expired_stock: String(orphan + 5),
    declared_deferred: '2',
    drift_stock: '3',
  }));
}

// ---------------------------------------------------------------------------
// 1) Força bruta: todas as séries de comprimento 0..5 com valores 0..3.
// ---------------------------------------------------------------------------
function* allSeries(maxLen: number, maxVal: number): Generator<number[]> {
  for (let len = 0; len <= maxLen; len += 1) {
    const total = (maxVal + 1) ** len;
    for (let code = 0; code < total; code += 1) {
      const s: number[] = [];
      let c = code;
      for (let i = 0; i < len; i += 1) {
        s.push(c % (maxVal + 1));
        c = Math.floor(c / (maxVal + 1));
      }
      yield s;
    }
  }
}

/** Referência independente das leis, escrita do zero (não chama a régua). */
function referenceVerdict(series: readonly number[]): OrphanTrendVerdict {
  if (series.length === 0) return 'no_history';
  const last = series[series.length - 1] ?? 0;
  if (last === 0) return 'clear';
  const block: number[] = [];
  for (let i = series.length - 1; i >= 0; i -= 1) {
    const v = series[i] ?? 0;
    if (v <= 0) break;
    block.unshift(v);
  }
  if (block.length < PERSIST_SAMPLES) return 'emerging';
  const up = block.every((v, i) => i === 0 || v > (block[i - 1] ?? 0));
  const down = block.every((v, i) => i === 0 || v < (block[i - 1] ?? 0));
  if (up) return 'growing';
  if (down) return 'resolving';
  return 'persistent';
}

let bruteCases = 0;
for (const series of allSeries(7, 3)) {
  bruteCases += 1;
  const expected = referenceVerdict(series);
  const got = classifyOrphanSeries(series);
  check(got === expected, `série [${series}] → ${got}, esperado ${expected}`);

  const a = assessOrphanTrendFromRows(rows(series));
  check(a.verdict === expected, `retrato [${series}] → ${a.verdict}, esperado ${expected}`);
  check(
    a.trend.join(',') === series.join(','),
    `série do retrato divergiu: [${a.trend}] vs [${series}]`
  );
  check(a.readable === series.length, `contagem de legíveis errada em [${series}]`);
  check(a.unreadable === 0, `ilegível fantasma em [${series}]`);
  check(a.orphanNow === (series[series.length - 1] ?? 0), `órfão atual errado em [${series}]`);

  // L2 — última foto zerada nunca acusa.
  if ((series[series.length - 1] ?? 0) === 0 && series.length > 0) {
    check(severityForTrend(a.verdict) === null, `[${series}] zerado no fim não pode emitir`);
  }
  // L3 — bloco curto nunca é persistente/crescente.
  const blockLen = (() => {
    let n = 0;
    for (let i = series.length - 1; i >= 0 && (series[i] ?? 0) > 0; i -= 1) n += 1;
    return n;
  })();
  if (blockLen > 0 && blockLen < PERSIST_SAMPLES) {
    check(a.verdict === 'emerging', `[${series}] bloco curto virou ${a.verdict}`);
  }
  check(a.consecutive === blockLen, `[${series}] consecutivos ${a.consecutive} ≠ ${blockLen}`);
  check(typeof renderTrendReason(a) === 'string' && renderTrendReason(a).length > 0, 'frase vazia');
}

// ---------------------------------------------------------------------------
// 2) L7 — ordem de chegada não pode alterar o veredito (embaralhamento).
// ---------------------------------------------------------------------------
function shuffle<T>(arr: readonly T[], seed: number): T[] {
  const out = arr.slice();
  let s = seed >>> 0;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}

for (const series of allSeries(5, 3)) {
  const canonical = assessOrphanTrendFromRows(rows(series)).verdict;
  for (let seed = 1; seed <= 8; seed += 1) {
    const scrambled = assessOrphanTrendFromRows(shuffle(rows(series), seed)).verdict;
    check(scrambled === canonical, `[${series}] mudou com embaralhamento ${seed}: ${scrambled}`);
  }
}

// ---------------------------------------------------------------------------
// 3) L1 — linha ilegível NUNCA vira zero (o pior defeito possível aqui).
// ---------------------------------------------------------------------------
const BROKEN: RawReconcileSnapshotRow[] = [
  {},
  { id: 9, observed_at: null, orphan_count: '4', verdict: 'unaccounted', expired_stock: '4' },
  {
    id: 10,
    observed_at: 'não é data',
    orphan_count: '4',
    verdict: 'unaccounted',
    expired_stock: '4',
  },
  {
    id: 11,
    observed_at: new Date(BASE).toISOString(),
    orphan_count: null,
    verdict: 'unaccounted',
    expired_stock: '1',
  },
  {
    id: 12,
    observed_at: new Date(BASE).toISOString(),
    orphan_count: '-3',
    verdict: 'unaccounted',
    expired_stock: '1',
  },
  {
    id: 13,
    observed_at: new Date(BASE).toISOString(),
    orphan_count: '1.5',
    verdict: 'unaccounted',
    expired_stock: '1',
  },
  {
    id: 14,
    observed_at: new Date(BASE).toISOString(),
    orphan_count: '2',
    verdict: '   ',
    expired_stock: '1',
  },
  {
    id: 15,
    observed_at: new Date(BASE).toISOString(),
    orphan_count: '2',
    verdict: 'unaccounted',
    expired_stock: 'x',
  },
];

for (const [i, raw] of BROKEN.entries()) {
  const r = readReconcileSnapshot(raw, i);
  check(r.status === 'unreadable', `linha quebrada #${i} passou como legível`);
  check(r.reason !== null, `linha quebrada #${i} sem motivo declarado`);
}

const onlyBroken = assessOrphanTrendFromRows(BROKEN);
check(
  onlyBroken.verdict === 'no_history',
  `só ilegíveis deveria ser no_history, veio ${onlyBroken.verdict}`
);
check(onlyBroken.readable === 0, 'legível fantasma entre ilegíveis');
check(onlyBroken.unreadable === BROKEN.length, 'ilegíveis não contabilizados');
check(severityForTrend(onlyBroken.verdict) === null, 'no_history não pode emitir sozinho');

// Ilegível intercalada não pode quebrar o bloco contíguo nem virar 0.
const mixed = assessOrphanTrendFromRows([...rows([3, 4, 5]), ...BROKEN]);
check(mixed.verdict === 'growing', `ilegíveis alteraram o veredito: ${mixed.verdict}`);
check(mixed.trend.join(',') === '3,4,5', `ilegível entrou na série: [${mixed.trend}]`);
check(mixed.unreadable === BROKEN.length, 'ilegíveis não somados no eixo separado');

// ---------------------------------------------------------------------------
// 4) Severidade: monotonicidade e ausência de emissão indevida.
// ---------------------------------------------------------------------------
const SEV: Record<OrphanTrendVerdict, string> = {
  no_history: 'none',
  clear: 'none',
  emerging: 'warning',
  resolving: 'warning',
  persistent: 'critical',
  growing: 'critical',
};
for (const [verdict, expected] of Object.entries(SEV) as [OrphanTrendVerdict, string][]) {
  check(
    (severityForTrend(verdict) ?? 'none') === expected,
    `severidade de ${verdict} deveria ser ${expected}`
  );
}

// ---------------------------------------------------------------------------
// 5) Janela: teto respeitado e fotos antigas fora da janela não pesam.
// ---------------------------------------------------------------------------
const long = rows([9, 9, 9, 0, 0, 0, 0, 0]);
const windowed = assessOrphanTrendFromRows(long, { window: 3 });
check(windowed.trend.length === 3, `janela 3 devolveu ${windowed.trend.length} pontos`);
check(
  windowed.verdict === 'clear',
  `janela 3 com zeros no fim deveria ser clear: ${windowed.verdict}`
);
const full = assessOrphanTrendFromRows(long);
check(full.trend.length === 8, 'janela padrão truncou indevidamente');
check(full.verdict === 'clear', 'zeros recentes governam mesmo com pico antigo');

// Janela inválida cai no padrão, nunca em série vazia.
for (const bad of [0, -1, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
  const a = assessOrphanTrendFromRows(rows([1, 2, 3]), { window: bad as number });
  check(a.trend.length === 3, `janela inválida ${bad} corrompeu a série`);
}

// ---------------------------------------------------------------------------
// 6) Entradas hostis: null, undefined, arrays com buracos.
// ---------------------------------------------------------------------------
for (const hostile of [null, undefined, [], [null], [undefined]]) {
  const a = assessOrphanTrendFromRows(hostile as never);
  check(a.verdict === 'no_history', `entrada hostil virou ${a.verdict}`);
  check(a.orphanNow === 0, 'órfão fabricado a partir de entrada vazia');
}
check(
  assessOrphanTrend(null).verdict === 'no_history',
  'assessOrphanTrend(null) deveria ser no_history'
);

// ---------------------------------------------------------------------------
// 7) Empates de observed_at: desempate estável por id (determinismo).
// ---------------------------------------------------------------------------
const sameInstant = new Date(BASE).toISOString();
const tied: RawReconcileSnapshotRow[] = [1, 2, 3, 4].map((n) => ({
  id: n,
  observed_at: sameInstant,
  verdict: 'unaccounted',
  orphan_count: String(n),
  expired_stock: String(n),
}));
const tiedVerdict = assessOrphanTrendFromRows(tied).verdict;
for (let seed = 1; seed <= 24; seed += 1) {
  check(
    assessOrphanTrendFromRows(shuffle(tied, seed)).verdict === tiedVerdict,
    `empate de instante virou não determinístico (seed ${seed})`
  );
}

console.log(
  failures.length === 0
    ? `✅ Onda 235 — ${assertions.toLocaleString('pt-BR')} asserções, ${bruteCases.toLocaleString('pt-BR')} séries por força bruta.`
    : `❌ ${failures.length} falha(s):\n` + failures.slice(0, 20).join('\n')
);
if (failures.length > 0) process.exit(1);
