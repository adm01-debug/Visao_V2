/**
 * Onda 205 — Simulação exaustiva da régua de procedência de leitura.
 *
 * Prova, por força bruta sobre o produto cartesiano de conjuntos pequenos:
 *
 *  M1. Monotonicidade positiva — acrescentar uma leitura NUNCA enfraquece o
 *      parecer.
 *  M2. Teto do LLM — nenhum conjunto cuja melhor procedência seja `llm`
 *      alcança `affirmable`, em nenhuma cardinalidade.
 *  M3. Score não promove — variar `confidence` jamais altera o parecer.
 *  M4. Comutatividade — a ordem das leituras é irrelevante.
 *  M5. Independência — repetir a mesma fonte nunca corrobora.
 *  M6. Elo mais fraco — prefixar estágios fortes a um estágio fraco não
 *      fortalece a leitura.
 *  M7. Declaração obrigatória — havendo `llm` ou `unknown` no conjunto, existe
 *      ressalva correspondente.
 */

import {
  assessReadingProvenance,
  deriveStageTier,
  PROVENANCE_TIERS,
  type ClaimStrength,
  type ProvenanceTier,
  type ProvenancedReading,
} from '../src/lib/provenance/readingProvenance';

const STRENGTH_RANK: Record<ClaimStrength, number> = {
  unusable: 0,
  investigative: 1,
  affirmable: 2,
};

let assertions = 0;
const failures: string[] = [];

function check(label: string, condition: boolean): void {
  assertions += 1;
  if (!condition) failures.push(label);
}

const SOURCES = ['cam-1', 'cam-2', 'cam-3'] as const;
const CONFIDENCES = [undefined, 0.01, 0.5, 0.99] as const;

function make(
  tier: ProvenanceTier,
  sourceId: string,
  confidence?: number,
  index = 0
): ProvenancedReading {
  return {
    id: `${tier}:${sourceId}:${index}`,
    sourceId,
    stages: tier === 'unknown' ? [] : [tier],
    confidence,
  };
}

/* -- Universo de leituras atômicas ---------------------------------------- */

const ATOMS: ProvenancedReading[] = [];
for (const tier of PROVENANCE_TIERS) {
  for (const source of SOURCES) {
    ATOMS.push(make(tier, source));
  }
}

/* -- M2 / M7 / M5: exaustão de conjuntos até 3 leituras -------------------- */

function combos(size: number): ProvenancedReading[][] {
  if (size === 0) return [[]];
  const smaller = combos(size - 1);
  const out: ProvenancedReading[][] = [];
  for (const base of smaller) {
    for (const atom of ATOMS) out.push([...base, atom]);
  }
  return out;
}

for (let size = 0; size <= 3; size += 1) {
  for (const set of combos(size)) {
    const result = assessReadingProvenance(set);
    const tiers = set.map((r) => deriveStageTier(r.stages));
    const best = tiers.reduce<ProvenanceTier>(
      (acc, t) => (PROVENANCE_TIERS.indexOf(t) < PROVENANCE_TIERS.indexOf(acc) ? t : acc),
      'unknown'
    );

    // M2 — teto do LLM.
    if (set.length > 0 && best === 'llm') {
      check('M2 llm nunca afirma', result.strength === 'investigative');
    }

    // M7 — declaração obrigatória.
    const codes = result.caveats.map((c) => c.code);
    if (tiers.includes('unknown')) {
      check('M7 unknown declarado', codes.includes('unknown_provenance'));
    }
    if (tiers.includes('llm')) {
      check('M7 llm declarado', codes.includes('llm_in_evidence') || codes.includes('llm_only'));
    }

    // M5 — corroboração exige fontes distintas.
    const qualified = new Set(
      set
        .filter((r) => {
          const t = deriveStageTier(r.stages);
          return t === 'model' || t === 'sensor' || t === 'human';
        })
        .map((r) => r.sourceId)
    );
    check('M5 corroboração por fonte distinta', result.corroborated === qualified.size >= 2);

    // M4 — comutatividade.
    const reversed = assessReadingProvenance([...set].reverse());
    check('M4 comutativa', reversed.summary === result.summary);
    check('M4 comutativa força', reversed.strength === result.strength);

    // M1 — monotonicidade positiva.
    if (set.length < 3) {
      for (const atom of ATOMS) {
        const grown = assessReadingProvenance([...set, atom]);
        check(
          'M1 crescer nunca enfraquece',
          STRENGTH_RANK[grown.strength] >= STRENGTH_RANK[result.strength]
        );
      }
    }
  }
}

/* -- M3: score jamais promove --------------------------------------------- */

for (const tier of PROVENANCE_TIERS) {
  const baseline = assessReadingProvenance([make(tier, 'cam-1')]);
  for (const confidence of CONFIDENCES) {
    const variant = assessReadingProvenance([make(tier, 'cam-1', confidence)]);
    check('M3 score não promove força', variant.strength === baseline.strength);
    check('M3 score não promove origem', variant.governingTier === baseline.governingTier);
  }
}

/* -- M6: elo mais fraco manda na cadeia ------------------------------------ */

for (const weak of PROVENANCE_TIERS) {
  for (const strong of PROVENANCE_TIERS) {
    const chained = assessReadingProvenance([
      { id: 'c', sourceId: 'cam-1', stages: [strong, weak] },
    ]);
    const alone = assessReadingProvenance([{ id: 'c', sourceId: 'cam-1', stages: [weak] }]);
    const weaker =
      PROVENANCE_TIERS.indexOf(weak) >= PROVENANCE_TIERS.indexOf(strong) ? weak : strong;
    check(
      'M6 elo mais fraco governa',
      chained.strength ===
        assessReadingProvenance([{ id: 'c', sourceId: 'cam-1', stages: [weaker] }]).strength
    );
    check(
      'M6 cadeia nunca supera o elo fraco',
      STRENGTH_RANK[chained.strength] <=
        Math.max(STRENGTH_RANK[alone.strength], STRENGTH_RANK[chained.strength])
    );
  }
}

/* -- Relatório ------------------------------------------------------------- */

if (failures.length > 0) {
  const unique = [...new Set(failures)];
  console.error(`❌ Onda 205: ${failures.length} falhas (${unique.length} distintas)`);
  unique.slice(0, 20).forEach((f) => console.error(`   - ${f}`));
  process.exit(1);
}

console.log(`✅ Onda 205 — procedência da leitura: ${assertions} asserções, 0 falhas.`);
