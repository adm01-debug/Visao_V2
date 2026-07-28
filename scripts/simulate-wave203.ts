/**
 * Simulação da Onda 203 — conferência de dossiê.
 *
 * O alvo não é "o código roda": é provar que nenhuma composição de peças
 * consegue arrancar do lote um parecer melhor do que os fatos sustentam.
 *
 * Frentes:
 *  S1. Exaustão do lote pequeno (todos os multiconjuntos de até 3 peças sobre
 *      os 6 resultados + ilegível). Exaurível, logo não sorteado.
 *  S2. Monotonicidade: acrescentar peça nunca melhora o cabeçalho.
 *  S3. Peça ilegível nunca acusa e nunca deixa o lote positivo.
 *  S4. Duplicata idêntica é inerte; colisão de selo é sempre crítica.
 *  S5. Permutação: a conclusão não depende da ordem do arquivo.
 *  S6. Lotes grandes aleatórios com invariante do pior elemento.
 */

import {
  summarizeBatch,
  piecesBySeverity,
  parseDossier,
  type BatchPiece,
} from '../src/lib/faces/attestationBatch';
import {
  severityRank,
  type ConferenceOutcome,
  type ConferenceResult,
} from '../src/lib/faces/attestationConference';

const OUTCOMES: readonly ConferenceOutcome[] = [
  'tampered',
  'forged_verdict',
  'registry_divergence',
  'unregistered',
  'origin_unknown',
  'authentic',
];

let assertions = 0;
const failures: string[] = [];

function check(label: string, cond: boolean): void {
  assertions += 1;
  if (!cond) failures.push(label);
}

function res(outcome: ConferenceOutcome): ConferenceResult {
  return {
    outcome,
    documentIntact: outcome !== 'tampered' && outcome !== 'forged_verdict',
    originConfirmed: outcome === 'authentic',
    documentVerdict: 'corroborated',
    tone: 'neutral',
    reasons: ['—'],
  };
}

function piece(index: number, outcome: ConferenceOutcome, seal?: string, fp?: string): BatchPiece {
  return {
    kind: 'conferred',
    index,
    rootHash: seal ?? `seal-${index}`,
    fingerprint: fp ?? `fp-${index}`,
    result: res(outcome),
  };
}

function unreadable(index: number): BatchPiece {
  return { kind: 'unreadable', index, reason: 'forma inválida' };
}

function reindex(pieces: readonly BatchPiece[]): BatchPiece[] {
  return pieces.map((p, i) =>
    p.kind === 'conferred' ? { ...p, index: i + 1 } : { ...p, index: i + 1 },
  );
}

/* -------- S1: exaustão de lotes até 3 peças -------------------------------- */

type Slot = ConferenceOutcome | 'unreadable';
const SLOTS: readonly Slot[] = [...OUTCOMES, 'unreadable'];

function build(slots: readonly Slot[]): BatchPiece[] {
  return slots.map((s, i) => (s === 'unreadable' ? unreadable(i + 1) : piece(i + 1, s)));
}

function combos(depth: number): Slot[][] {
  if (depth === 0) return [[]];
  const rest = combos(depth - 1);
  const out: Slot[][] = [];
  for (const s of SLOTS) for (const r of rest) out.push([s, ...r]);
  return out;
}

const smallBatches: Slot[][] = [[], ...combos(1), ...combos(2), ...combos(3)];

for (const slots of smallBatches) {
  const pieces = build(slots);
  const s = summarizeBatch(pieces);
  const conferred = slots.filter((x) => x !== 'unreadable') as ConferenceOutcome[];

  check('total bate', s.total === pieces.length);
  check('conferidas bate', s.conferred === conferred.length);
  check('ilegíveis bate', s.unreadable === slots.length - conferred.length);

  if (conferred.length === 0) {
    check('sem conferência não há cabeçalho', s.headline === null);
    check('sem conferência o tom é neutro', s.tone === 'neutral');
  } else {
    const worst = conferred.reduce((w, o) => (severityRank(o) < severityRank(w) ? o : w));
    check('cabeçalho é o pior', s.headline === worst);
    // S3 — nenhum lote com peça ilegível pode brilhar.
    if (s.unreadable > 0) check('ilegível barra positivo', s.tone !== 'positive');
    if (s.headline === 'authentic' && s.unreadable === 0) {
      check('autêntico completo é positivo', s.tone === 'positive');
    }
    // O cabeçalho nunca é melhor que qualquer peça.
    for (const o of conferred) {
      check('cabeçalho ≤ peça', severityRank(s.headline!) <= severityRank(o));
    }
  }

  check('motivos nunca vazios', s.reasons.length > 0);
  check('sem colisão em selos distintos', s.conflicts.length === 0);
  check('contagem soma conferidas', OUTCOMES.reduce((a, o) => a + s.counts[o], 0) === s.conferred);

  // S5 — permutação não altera a conclusão.
  const reversed = summarizeBatch(reindex([...pieces].reverse()));
  check('ordem não muda cabeçalho', reversed.headline === s.headline);
  check('ordem não muda tom', reversed.tone === s.tone);

  // triagem preserva o conjunto
  check('triagem preserva tamanho', piecesBySeverity(pieces).length === pieces.length);
}

/* -------- S2: monotonicidade ---------------------------------------------- */

for (const base of combos(2)) {
  for (const extra of SLOTS) {
    const before = summarizeBatch(build(base));
    const after = summarizeBatch(build([...base, extra]));
    if (before.headline && after.headline) {
      check(
        'acrescentar peça nunca melhora',
        severityRank(after.headline) <= severityRank(before.headline),
      );
    }
    if (extra === 'unreadable') {
      check('ilegível não muda o veredito', after.headline === before.headline);
      check('ilegível nunca cria crítico', before.tone === 'critical' || after.tone !== 'critical');
      check('cobertura cai', after.coverage !== 'full');
    }
  }
}

/* -------- S4: duplicatas e colisões --------------------------------------- */

for (const o of OUTCOMES) {
  const single = summarizeBatch([piece(1, o, 'seal-x', 'fp-a')]);
  const dup = summarizeBatch([piece(1, o, 'seal-x', 'fp-a'), piece(2, o, 'seal-x', 'fp-a')]);
  check('duplicata não muda veredito', dup.headline === single.headline);
  check('duplicata não muda tom', dup.tone === single.tone);
  check('duplicata contabilizada', dup.duplicates === 1 && dup.distinctSeals === 1);
  check('duplicata não é colisão', dup.conflicts.length === 0);

  const collide = summarizeBatch([piece(1, o, 'seal-x', 'fp-a'), piece(2, o, 'seal-x', 'fp-b')]);
  check('colisão é sempre crítica', collide.headline === 'tampered' && collide.tone === 'critical');
  check('colisão registrada com posições', collide.conflicts[0]?.indexes.join(',') === '1,2');
  check(
    'colisão relatada em texto',
    collide.reasons.some((r) => r.includes('mesmo selo')),
  );
}

// Colisão tripla com uma duplicata idêntica no meio: ainda é uma só colisão.
{
  const s = summarizeBatch([
    piece(1, 'authentic', 'seal-x', 'fp-a'),
    piece(2, 'authentic', 'seal-x', 'fp-a'),
    piece(3, 'authentic', 'seal-x', 'fp-b'),
  ]);
  check('colisão triplas agrupadas', s.conflicts.length === 1);
  check('colisão lista as três posições', s.conflicts[0]?.indexes.join(',') === '1,2,3');
  check('colisão vence duplicata', s.headline === 'tampered');
}

/* -------- S6: lotes grandes ------------------------------------------------ */

let seed = 20260728;
function rnd(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

for (let round = 0; round < 3000; round += 1) {
  const n = 1 + Math.floor(rnd() * 40);
  const slots: Slot[] = [];
  for (let i = 0; i < n; i += 1) {
    slots.push(SLOTS[Math.floor(rnd() * SLOTS.length)]!);
  }
  const pieces = build(slots);
  const s = summarizeBatch(pieces);
  const conferred = slots.filter((x) => x !== 'unreadable') as ConferenceOutcome[];

  if (conferred.length > 0) {
    const worst = conferred.reduce((w, o) => (severityRank(o) < severityRank(w) ? o : w));
    check('lote grande: pior manda', s.headline === worst);
    check(
      'lote grande: tom coerente',
      s.tone === 'positive' ? worst === 'authentic' && s.unreadable === 0 : true,
    );
  } else {
    check('lote grande sem conferência é nulo', s.headline === null);
  }
  check('lote grande: contagem fecha', s.conferred + s.unreadable === s.total);
  check(
    'triagem ordena por gravidade',
    piecesBySeverity(pieces).every((p, i, arr) => {
      if (i === 0) return true;
      const rank = (x: BatchPiece) =>
        x.kind === 'conferred' ? severityRank(x.result.outcome) : severityRank('origin_unknown');
      return rank(arr[i - 1]!) <= rank(p);
    }),
  );
}

/* -------- S7: leitura do arquivo ------------------------------------------ */

const goodDoc = { rootHash: 'h', chain: ['a'], stays: [] };
const parseCases: Array<[string, string, number]> = [
  ['avulso', JSON.stringify(goodDoc), 1],
  ['array', JSON.stringify([goodDoc, goodDoc, goodDoc]), 3],
  ['envelope attestations', JSON.stringify({ attestations: [goodDoc] }), 1],
  ['envelope items', JSON.stringify({ items: [goodDoc, goodDoc] }), 2],
  ['array vazio', '[]', 0],
  ['peça inválida', JSON.stringify([goodDoc, 42, null, 'x']), 4],
];
for (const [label, raw, expected] of parseCases) {
  const parsed = parseDossier(raw);
  check(`parse ${label}`, parsed.entries.length === expected);
  check(
    `parse ${label} indexa a partir de 1`,
    parsed.entries.every((e, i) => e.index === i + 1),
  );
}
for (const bad of ['{', 'null', '42', '"texto"', '']) {
  let threw = false;
  try {
    parseDossier(bad);
  } catch {
    threw = true;
  }
  check(`parse recusa ${JSON.stringify(bad)}`, threw);
}

/* -------- Relatório -------------------------------------------------------- */

if (failures.length > 0) {
  const unique = [...new Set(failures)];
  console.error(`✗ Onda 203: ${failures.length} falhas (${unique.length} distintas)`);
  for (const f of unique.slice(0, 20)) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`✓ Onda 203 — dossiê conferido: ${assertions.toLocaleString('pt-BR')} asserções, 0 falhas`);
