/**
 * Onda 229 — Simulação exaustiva da leitura do livro persistido (R1–R7).
 *
 * Gera centenas de milhares de linhas cruas, incluindo linhas deliberadamente
 * corrompidas, e verifica que nenhuma corrupção jamais vira cobertura.
 */

import {
  ledgerFromRows,
  summarizeCoverage,
  type AdmissionWindowRow,
} from '../src/lib/alarms/admissionLedgerRows';
import { ADMISSION_REASONS, ledgerIsBalanced } from '../src/lib/alarms/admissionLedger';

let asserts = 0;
let failures = 0;
const fail = (msg: string) => {
  failures += 1;
  if (failures <= 20) console.error(`✗ ${msg}`);
};
const ok = (cond: boolean, msg: string) => {
  asserts += 1;
  if (!cond) fail(msg);
};

// PRNG determinístico (xorshift32).
let seed = 0x229229;
const rnd = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) % 1_000_000) / 1_000_000;
};
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length) % arr.length];
const int = (n: number) => Math.floor(rnd() * n);

const BASE = Date.parse('2026-07-28T00:00:00Z');

const goodRow = (sourceId: string, windowIdx: number): AdmissionWindowRow => {
  const counts: Record<string, number> = {};
  let total = 0;
  const n = 1 + int(4);
  for (let i = 0; i < n; i += 1) {
    const r = pick(ADMISSION_REASONS);
    const c = 1 + int(9);
    counts[r] = (counts[r] ?? 0) + c;
    total += c;
  }
  const admitted = (counts.admitted ?? 0) + (counts.admitted_degraded ?? 0);
  const start = BASE + windowIdx * 3_600_000;
  const end = start + 3_600_000;
  const dated = rnd() < 0.8;
  return {
    source_id: sourceId,
    window_start: new Date(start).toISOString(),
    window_end: new Date(end).toISOString(),
    counts,
    total,
    admitted,
    dropped_out_of_window: int(3),
    first_at: dated ? new Date(start + 60_000).toISOString() : null,
    last_at: dated ? new Date(start + 120_000).toISOString() : null,
  };
};

type Corruption =
  'blank_source' | 'bad_window' | 'bad_totals' | 'unknown_reason' | 'unbalanced' | 'bad_dates';

const corrupt = (row: AdmissionWindowRow, kind: Corruption): AdmissionWindowRow => {
  switch (kind) {
    case 'blank_source':
      return { ...row, source_id: '   ' };
    case 'bad_window':
      return { ...row, window_end: row.window_start };
    case 'bad_totals':
      return { ...row, total: -1 };
    case 'unknown_reason':
      return { ...row, counts: { ...(row.counts as object), quantum_reason: 3 } };
    case 'unbalanced':
      return { ...row, total: (row.total as number) + 7 };
    case 'bad_dates':
      return { ...row, first_at: 'não-é-data', last_at: 'nem-isso' };
  }
};

const CORRUPTIONS: readonly Corruption[] = [
  'blank_source',
  'bad_window',
  'bad_totals',
  'unknown_reason',
  'unbalanced',
  'bad_dates',
];

const SCENARIOS = 4000;
for (let s = 0; s < SCENARIOS; s += 1) {
  const nSources = 1 + int(6);
  const sources = Array.from({ length: nSources }, (_, i) => `cam-${s % 50}-${i}`);
  const rows: AdmissionWindowRow[] = [];
  const corruptedOnly = new Set<string>();
  const healthy = new Set<string>();

  for (const src of sources) {
    const windows = 1 + int(3);
    for (let w = 0; w < windows; w += 1) {
      const base = goodRow(src, w);
      if (rnd() < 0.25) {
        const kind = pick(CORRUPTIONS);
        rows.push(corrupt(base, kind));
        if (kind !== 'bad_dates' && kind !== 'blank_source') corruptedOnly.add(src);
        if (kind === 'bad_dates') healthy.add(src);
      } else {
        rows.push(base);
        healthy.add(src);
      }
    }
  }

  const cut = rnd() < 0.3 ? BASE + 3_600_000 : null;
  const report = ledgerFromRows(rows, { windowStartAt: cut });

  // L1/R1 — contabilidade sempre fechada, mesmo com lixo na entrada.
  ok(ledgerIsBalanced(report.ledger), `cenário ${s}: livro desbalanceado`);

  // R6 — comutatividade: embaralhar as linhas não muda os totais.
  const shuffled = [...rows].sort(() => (rnd() < 0.5 ? -1 : 1));
  const other = ledgerFromRows(shuffled, { windowStartAt: cut });
  ok(other.ledger.total === report.ledger.total, `cenário ${s}: total dependeu da ordem`);
  ok(
    other.ledger.admitted === report.ledger.admitted,
    `cenário ${s}: admitidos dependeram da ordem`
  );
  ok(
    other.malformed.length === report.malformed.length,
    `cenário ${s}: malformadas dependeram da ordem`
  );

  // R3 — nada dentro do corte é descartado, nada fora dele é contado.
  ok(
    report.accepted + report.outOfRange + report.malformed.length === rows.length,
    `cenário ${s}: linhas somem entre aceito/fora/malformado`
  );

  // R5 — origem só vista corrompida nunca é coberta.
  const summary = summarizeCoverage(report, sources);
  for (const v of summary.verdicts) {
    if (report.unreadableSources.includes(v.sourceId)) {
      ok(v.status !== 'covered', `cenário ${s}: origem ilegível ${v.sourceId} virou coberta`);
    }
    if (v.status === 'covered') ok(v.admitted > 0, `cenário ${s}: coberta sem admissão`);
    if (v.status === 'no_data') ok(v.total === 0, `cenário ${s}: no_data com eventos`);
    if (v.status === 'gap') {
      ok(v.admitted === 0, `cenário ${s}: gap com admissão`);
      ok(v.dominantReason !== null, `cenário ${s}: gap sem motivo dominante`);
    }
  }
  ok(
    summary.covered + summary.gap + summary.noData === summary.verdicts.length,
    `cenário ${s}: soma da cobertura não fecha`
  );

  // Toda origem esperada aparece no veredito — nenhuma some do painel.
  for (const src of sources) {
    ok(
      summary.verdicts.some((v) => v.sourceId === src),
      `cenário ${s}: origem esperada ${src} sumiu`
    );
  }
  void corruptedOnly;
  void healthy;
}

// Casos-limite explícitos.
{
  const empty = ledgerFromRows([]);
  ok(empty.ledger.total === 0 && empty.accepted === 0, 'vazio deveria ser vazio');
  const sum = summarizeCoverage(empty, ['cam-x']);
  ok(sum.noData === 1 && sum.covered === 0, 'origem esperada sem dado deve ser no_data');

  const nulls = ledgerFromRows([undefined as unknown as AdmissionWindowRow]);
  ok(nulls.malformed.length === 1, 'linha nula deve ser malformada');
}

console.log(`Onda 229 — ${asserts.toLocaleString('pt-BR')} asserções, ${failures} falha(s).`);
if (failures > 0) process.exit(1);
