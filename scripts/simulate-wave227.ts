/**
 * Onda 227 — Simulação exaustiva do livro de admissão.
 *
 * Estratégia: oráculo independente (contagem ingênua sobre a lista bruta)
 * confrontado com o livro, mais invariantes estruturais que não dependem do
 * oráculo (fechamento, comutatividade, associatividade, monotonicidade).
 */
import {
  ADMISSION_REASONS,
  OTHER_BUCKET,
  assessCoverage,
  buildAdmissionLedger,
  ledgerIsBalanced,
  mergeAdmissionLedgers,
  type LedgerEntry,
} from '../src/lib/alarms/admissionLedger';
import type { AdmissionReason } from '../src/lib/alarms/eventAdmission';

let assertions = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = '') => {
  assertions += 1;
  if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ''}`);
};

let seed = 20260728;
const rnd = (n: number) => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed % n;
};
const shuffle = <T>(arr: readonly T[]): T[] => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = rnd(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const BASE = Date.UTC(2026, 6, 27, 0, 0, 0);

const randomEntry = (sources: readonly string[]): LedgerEntry => {
  const reason = ADMISSION_REASONS[rnd(ADMISSION_REASONS.length)];
  const dated = rnd(10) !== 0;
  return {
    sourceId: rnd(20) === 0 ? '' : sources[rnd(sources.length)],
    at: dated ? BASE + rnd(1000) * 60_000 : rnd(2) === 0 ? null : Number.NaN,
    verdict: { reason },
  };
};

// ---------------------------------------------------------------- oráculo
const oracle = (entries: readonly LedgerEntry[], windowStartAt: number | null) => {
  const counts = Object.fromEntries(ADMISSION_REASONS.map((r) => [r, 0])) as Record<
    AdmissionReason,
    number
  >;
  let total = 0;
  let admitted = 0;
  let dropped = 0;
  for (const e of entries) {
    const at = typeof e.at === 'number' && Number.isFinite(e.at) ? e.at : null;
    if (windowStartAt !== null && at !== null && at < windowStartAt) {
      dropped += 1;
      continue;
    }
    total += 1;
    counts[e.verdict.reason] += 1;
    if (e.verdict.reason === 'admitted' || e.verdict.reason === 'admitted_degraded') admitted += 1;
  }
  return { total, admitted, counts, dropped };
};

// ------------------------------------------------------- cenários massivos
for (let scenario = 0; scenario < 4000; scenario += 1) {
  const sourceCount = 1 + rnd(12);
  const sources = Array.from({ length: sourceCount }, (_, i) => `cam-${i}`);
  const entries = Array.from({ length: rnd(40) }, () => randomEntry(sources));
  const windowStartAt = rnd(3) === 0 ? BASE + rnd(1000) * 60_000 : null;
  const maxSources = rnd(4) === 0 ? 1 + rnd(5) : undefined;

  const ledger = buildAdmissionLedger(entries, { windowStartAt, maxSources });
  const o = oracle(entries, windowStartAt);

  check('L1/oráculo total', ledger.total === o.total, `${ledger.total} ≠ ${o.total}`);
  check('L1/oráculo admitidos', ledger.admitted === o.admitted);
  check('L3 descarte declarado', ledger.droppedOutOfWindow === o.dropped);
  for (const r of ADMISSION_REASONS) {
    check(`L1 balde ${r}`, ledger.counts[r] === o.counts[r]);
  }
  check('L1 fechamento', ledgerIsBalanced(ledger));

  // L5 — comutatividade: embaralhar não muda nada (exceto nada, de fato).
  const shuffled = buildAdmissionLedger(shuffle(entries), { windowStartAt, maxSources });
  check(
    'L5 comutatividade',
    JSON.stringify(shuffled) === JSON.stringify(ledger),
    'ordem de chegada alterou o livro'
  );

  // L4 — evento sem data nunca move as bordas.
  for (const s of ledger.bySource) {
    if (s.firstAt !== null) {
      check('L4 borda dentro da janela', windowStartAt === null || s.firstAt >= windowStartAt);
      check('L4 first ≤ last', s.lastAt !== null && s.firstAt <= s.lastAt);
    } else {
      check('L4 sem data ⇒ sem borda', s.lastAt === null);
    }
  }

  // L8 — teto respeitado e excedente sempre visível.
  const namedBuckets = ledger.bySource.filter((s) => s.sourceId !== OTHER_BUCKET);
  check('L8 teto', namedBuckets.length <= ledger.maxSources, `${namedBuckets.length}`);
  const hasUnnamed =
    entries.some((e) => {
      const at = typeof e.at === 'number' && Number.isFinite(e.at) ? e.at : null;
      if (windowStartAt !== null && at !== null && at < windowStartAt) return false;
      return true;
    }) && ledger.total > namedBuckets.reduce((a, s) => a + s.total, 0);
  if (hasUnnamed) {
    check(
      'L8 excedente visível',
      ledger.bySource.some((s) => s.sourceId === OTHER_BUCKET)
    );
  }
  const other = ledger.bySource.find((s) => s.sourceId === OTHER_BUCKET);
  if (other)
    check('L8 __other__ é o último', ledger.bySource[ledger.bySource.length - 1] === other);

  // L6 — cobertura
  const coverage = assessCoverage(ledger, sources);
  const seen = new Set<string>();
  for (const c of coverage) {
    check('L6 origem única', !seen.has(c.sourceId));
    seen.add(c.sourceId);
    const s = ledger.bySource.find((x) => x.sourceId === c.sourceId);
    if (!s || s.total === 0) {
      check('L6 sem dado nunca é coberta', c.status === 'no_data' && c.dominantReason === null);
    } else if (s.admitted > 0) {
      check('L6 admissão ⇒ coberta', c.status === 'covered');
    } else {
      check('L6 lacuna declara motivo', c.status === 'gap' && c.dominantReason !== null);
      const dom = c.dominantReason as AdmissionReason;
      const domCount = s.counts[dom];
      check(
        'L6 motivo dominante é o mais frequente',
        ADMISSION_REASONS.every((r) => s.counts[r] <= domCount)
      );
      check('L6 lacuna nunca admite', c.admitted === 0);
    }
  }
  for (const id of sources) {
    check(
      'L6 inventário sempre presente',
      coverage.some((c) => c.sourceId === id),
      id
    );
  }

  // L7 — fusão comutativa/associativa por partição arbitrária
  const cut = rnd(entries.length + 1);
  const a = buildAdmissionLedger(entries.slice(0, cut), { windowStartAt, maxSources: 10_000 });
  const b = buildAdmissionLedger(entries.slice(cut), { windowStartAt, maxSources: 10_000 });
  const whole = buildAdmissionLedger(entries, { windowStartAt, maxSources: 10_000 });
  const ab = mergeAdmissionLedgers([a, b]);
  const ba = mergeAdmissionLedgers([b, a]);
  check('L7 comutativa', JSON.stringify(ab.counts) === JSON.stringify(ba.counts));
  check('L7 fusão = todo (total)', ab.total === whole.total, `${ab.total} ≠ ${whole.total}`);
  check('L7 fusão = todo (admitidos)', ab.admitted === whole.admitted);
  for (const r of ADMISSION_REASONS) check(`L7 fusão balde ${r}`, ab.counts[r] === whole.counts[r]);
  check('L7 fusão fechada', ledgerIsBalanced(ab));
  const wholeSources = new Map(whole.bySource.map((s) => [s.sourceId, s]));
  for (const s of ab.bySource) {
    const w = wholeSources.get(s.sourceId);
    check('L7 origem preservada', !!w, s.sourceId);
    if (w) {
      check('L7 total por origem', s.total === w.total);
      check('L7 bordas por origem', s.firstAt === w.firstAt && s.lastAt === w.lastAt);
    }
  }
  const c3 = buildAdmissionLedger([randomEntry(sources)], { windowStartAt, maxSources: 10_000 });
  check(
    'L7 associativa',
    JSON.stringify(mergeAdmissionLedgers([mergeAdmissionLedgers([a, b]), c3]).counts) ===
      JSON.stringify(mergeAdmissionLedgers([a, mergeAdmissionLedgers([b, c3])]).counts)
  );

  // Monotonicidade: acrescentar um evento nunca reduz nenhum balde.
  const grown = buildAdmissionLedger([...entries, randomEntry(sources)], {
    windowStartAt,
    maxSources: 10_000,
  });
  for (const r of ADMISSION_REASONS) {
    check(`monotonicidade ${r}`, grown.counts[r] >= whole.counts[r]);
  }
}

// -------------------------------------------------------------- fronteiras
{
  const empty = buildAdmissionLedger([]);
  check('vazio é fechado', ledgerIsBalanced(empty) && empty.total === 0);
  check('vazio sem origens', empty.bySource.length === 0);
  check(
    'inventário sem evento é no_data',
    assessCoverage(empty, ['cam-1']).every((c) => c.status === 'no_data')
  );

  const undated = buildAdmissionLedger(
    [{ sourceId: 'cam-1', at: null, verdict: { reason: 'indeterminate' } }],
    { windowStartAt: BASE }
  );
  check('L3 sem data nunca é descartado pela janela', undated.total === 1);
  check('L3 sem data não vira descarte', undated.droppedOutOfWindow === 0);
  check('L4 sem data não datou', undated.bySource[0].firstAt === null);

  const lixo = buildAdmissionLedger([
    { sourceId: 'cam-1', at: BASE, verdict: { reason: 'nao_existe' as AdmissionReason } },
  ]);
  check('motivo desconhecido é ignorado, não contado', lixo.total === 0);

  const fusaoVazia = mergeAdmissionLedgers([]);
  check('fusão vazia é neutra', fusaoVazia.total === 0 && ledgerIsBalanced(fusaoVazia));

  const j1 = buildAdmissionLedger([{ sourceId: 'a', at: BASE, verdict: { reason: 'admitted' } }], {
    windowStartAt: BASE,
  });
  const j2 = buildAdmissionLedger([{ sourceId: 'a', at: BASE, verdict: { reason: 'admitted' } }], {
    windowStartAt: BASE + 1000,
  });
  check(
    'L7 janela resultante é a mais recente',
    mergeAdmissionLedgers([j1, j2]).windowStartAt === BASE + 1000
  );
}

console.log(
  failures.length === 0
    ? `✓ Onda 227 OK — ${assertions.toLocaleString('pt-BR')} asserções sem falha`
    : `✗ Onda 227 — ${failures.length} falhas em ${assertions} asserções\n${[...new Set(failures)].slice(0, 15).join('\n')}`
);
process.exit(failures.length === 0 ? 0 : 1);
