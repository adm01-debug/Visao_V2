/**
 * Onda 205 — Procedência da leitura (de onde veio o que o sistema afirma).
 *
 * O teardown do `GetStream/Vision-Agents` deixou um risco explícito: o próprio
 * repositório admite que LLMs multimodais erram texto pequeno (placas, crachás)
 * e ainda assim devolvem a resposta com a mesma confiança de um sensor. No
 * VISÃO, uma leitura vinda de um modelo generativo e uma leitura vinda do
 * hardware ANPR chegam hoje ao mesmo campo de texto — e daí seguem, sem marca,
 * até o atestado probatório da Onda 200. Um documento que diz "placa ABC1D23"
 * sem dizer *quem leu* mistura medição com paráfrase.
 *
 * Este módulo é a régua única da procedência. Puro: sem rede, sem banco, sem
 * relógio, sem I/O. Recebe as leituras que sustentam uma afirmação e devolve
 * (a) o que o conjunto **pode** afirmar e (b) o que precisa ser **declarado**.
 *
 * ## Sete leis que não podem ser revertidas
 *
 * P1. **Confiança numérica nunca promove procedência.** Um LLM devolvendo
 *     `0.99` continua sendo `llm`. O número mede a certeza *do emissor sobre si
 *     mesmo*; a procedência mede *o que o emissor é*. Deixar o score promover a
 *     origem é o caminho mais curto para uma alucinação virar prova.
 *
 * P2. **LLM jamais sustenta afirmação sozinho.** No máximo `investigative` —
 *     serve para dizer "vá olhar aqui", nunca "foi isto". Nem mesmo com dez
 *     leituras concordantes: dez execuções do mesmo modelo sobre o mesmo frame
 *     não são dez testemunhas, são uma testemunha repetida.
 *
 * P3. **Corroboração exige independência de fonte.** Duas leituras só se
 *     corroboram se vierem de `sourceId` distintos. Mesma câmera + mesmo
 *     pipeline = uma fonte, por mais vezes que dispare.
 *
 * P4. **Procedência derivada é a do elo mais fraco.** Se um LLM resume o que um
 *     sensor mediu, o resumo é `llm`. A cadeia não empresta o peso do primeiro
 *     estágio ao último ({@link deriveStageTier}).
 *
 * P5. **Ausência de procedência é `unknown`, e `unknown` é inutilizável.**
 *     Nunca `sensor` por omissão, nunca "provavelmente o modelo". Documento sem
 *     campo de origem não é documento com origem boa.
 *
 * P6. **O melhor sustenta, o pior se declara.** A força da afirmação sai da
 *     melhor leitura disponível; a ressalva sai da pior leitura presente. As
 *     duas convivem: um conjunto pode ser afirmável *e* obrigado a revelar que
 *     havia um palpite de LLM na mesa.
 *
 * P7. **Nada aqui inventa leitura.** Conjunto vazio devolve `unusable` com
 *     motivo `no_reading` — jamais um veredito neutro que a tela possa pintar
 *     de verde.
 */

/* ========================================================================== */
/*  Taxonomia                                                                 */
/* ========================================================================== */

/**
 * Procedências reconhecidas, da mais forte à mais fraca. A ordem é semântica,
 * não estética: é ela que decide o que vira prova e o que vira pista.
 */
export const PROVENANCE_TIERS = [
  /** Confirmação explícita de um operador identificado. */
  'human',
  /** Medição do próprio equipamento (ANPR embarcado, evento ONVIF, I/O físico). */
  'sensor',
  /** Modelo determinístico nosso (embedding facial, detector, OCR clássico). */
  'model',
  /** Modelo generativo (visão-linguagem). Descreve; não mede. */
  'llm',
  /** Origem não declarada. */
  'unknown',
] as const;

export type ProvenanceTier = (typeof PROVENANCE_TIERS)[number];

/** Peso probatório. Maior é mais forte. `unknown` vale zero de propósito. */
export const PROVENANCE_WEIGHT: Record<ProvenanceTier, number> = {
  human: 4,
  sensor: 3,
  model: 2,
  llm: 1,
  unknown: 0,
};

/** Peso mínimo que uma leitura precisa ter para corroborar outra (P2/P3). */
export const CORROBORATION_FLOOR = PROVENANCE_WEIGHT.model;

export const PROVENANCE_LABEL: Record<ProvenanceTier, string> = {
  human: 'Confirmação humana',
  sensor: 'Medição do equipamento',
  model: 'Modelo determinístico',
  llm: 'Modelo generativo (descrição)',
  unknown: 'Origem não declarada',
};

export const PROVENANCE_DESCRIPTION: Record<ProvenanceTier, string> = {
  human: 'Um operador identificado confirmou a leitura manualmente.',
  sensor: 'A própria câmera/dispositivo mediu e reportou o evento.',
  model:
    'Modelo determinístico do VISÃO (embedding/detector) produziu a leitura; ' +
    'admite erro estatístico, mas é reprodutível sobre o mesmo frame.',
  llm:
    'Modelo generativo descreveu a cena. Pode alucinar texto pequeno (placas, ' +
    'crachás) com alta confiança aparente: serve como pista de investigação, ' +
    'nunca como afirmação.',
  unknown:
    'A leitura chegou sem declarar origem. Não é possível avaliar seu peso ' +
    'probatório — trate como inexistente até que a origem seja reconstituída.',
};

/**
 * Normaliza um rótulo de origem vindo de fora (banco, payload de terceiro).
 * Qualquer valor não reconhecido vira `unknown` (P5) — nunca o mais próximo.
 */
export function normalizeProvenanceTier(raw: unknown): ProvenanceTier {
  if (typeof raw !== 'string') return 'unknown';
  const value = raw.trim().toLowerCase();
  return (PROVENANCE_TIERS as readonly string[]).includes(value)
    ? (value as ProvenanceTier)
    : 'unknown';
}

/** Compara duas procedências pelo peso. Positivo = `a` é mais forte. */
export function compareProvenance(a: ProvenanceTier, b: ProvenanceTier): number {
  return PROVENANCE_WEIGHT[a] - PROVENANCE_WEIGHT[b];
}

/**
 * P4 — procedência de uma leitura derivada de estágios encadeados: sempre a do
 * elo mais fraco. Cadeia vazia é `unknown`.
 */
export function deriveStageTier(stages: readonly ProvenanceTier[]): ProvenanceTier {
  if (stages.length === 0) return 'unknown';
  return stages.reduce<ProvenanceTier>(
    (worst, tier) => (compareProvenance(tier, worst) < 0 ? tier : worst),
    stages[0],
  );
}

/* ========================================================================== */
/*  Entrada                                                                   */
/* ========================================================================== */

export interface ProvenancedReading {
  /** Identificador da leitura (para rastreio na ressalva). */
  readonly id: string;
  /**
   * Fonte independente que produziu a leitura. Câmera + pipeline, tipicamente.
   * Duas leituras com o mesmo `sourceId` NUNCA se corroboram (P3).
   */
  readonly sourceId: string;
  /**
   * Cadeia de estágios até a leitura final. Um único estágio é o caso comum;
   * `['sensor', 'llm']` descreve um LLM parafraseando uma medição (P4).
   */
  readonly stages: readonly ProvenanceTier[];
  /**
   * Confiança auto-reportada, quando existir. Registrada para exibição e
   * **ignorada** na classificação (P1).
   */
  readonly confidence?: number;
}

/* ========================================================================== */
/*  Saída                                                                     */
/* ========================================================================== */

export type ClaimStrength =
  /** Pode ser afirmado como fato do sistema. */
  | 'affirmable'
  /** Serve para direcionar investigação. Nunca vai a documento como afirmação. */
  | 'investigative'
  /** Não sustenta nada. */
  | 'unusable';

export const CLAIM_STRENGTH_LABEL: Record<ClaimStrength, string> = {
  affirmable: 'Afirmável',
  investigative: 'Apenas investigativo',
  unusable: 'Não sustenta afirmação',
};

export type ProvenanceCaveatCode =
  | 'no_reading'
  | 'unknown_provenance'
  | 'llm_in_evidence'
  | 'llm_only'
  | 'uncorroborated_model'
  | 'single_source'
  | 'confidence_without_provenance';

export interface ProvenanceCaveat {
  readonly code: ProvenanceCaveatCode;
  /** Quantas leituras motivaram a ressalva. Nunca zero. */
  readonly count: number;
  readonly detail: string;
}

export interface ProvenanceAssessment {
  /** Força do que o conjunto sustenta. Sai da MELHOR leitura (P6). */
  readonly strength: ClaimStrength;
  /** Melhor procedência presente. `null` só quando não há leitura. */
  readonly bestTier: ProvenanceTier | null;
  /** Pior procedência presente — a que precisa ser declarada (P6). */
  readonly worstTier: ProvenanceTier | null;
  /** Procedência que efetivamente sustenta a afirmação, quando há uma. */
  readonly governingTier: ProvenanceTier | null;
  /** Fontes independentes com peso ≥ {@link CORROBORATION_FLOOR}. */
  readonly independentSources: number;
  /** Houve corroboração por fonte independente qualificada (P3). */
  readonly corroborated: boolean;
  readonly readingCount: number;
  readonly caveats: readonly ProvenanceCaveat[];
  /** Frase pronta, em português, para a tela e para o documento. */
  readonly summary: string;
}

/* ========================================================================== */
/*  Régua                                                                     */
/* ========================================================================== */

const EMPTY_ASSESSMENT: ProvenanceAssessment = {
  strength: 'unusable',
  bestTier: null,
  worstTier: null,
  governingTier: null,
  independentSources: 0,
  corroborated: false,
  readingCount: 0,
  caveats: [
    {
      code: 'no_reading',
      count: 1,
      detail:
        'Nenhuma leitura sustenta esta afirmação. Ausência de leitura não é ' +
        'ausência do fato — e também não é prova dele.',
    },
  ],
  summary: 'Sem leitura: nada pode ser afirmado.',
};

/**
 * Avalia o que um conjunto de leituras sustenta.
 *
 * Determinística e comutativa: a ordem das leituras não altera o resultado.
 */
export function assessReadingProvenance(
  readings: readonly ProvenancedReading[],
): ProvenanceAssessment {
  if (readings.length === 0) return EMPTY_ASSESSMENT;

  const tiers = readings.map((reading) => deriveStageTier(reading.stages));

  let bestTier: ProvenanceTier = 'unknown';
  let worstTier: ProvenanceTier = 'human';
  const qualifiedSources = new Set<string>();
  let unknownCount = 0;
  let llmCount = 0;
  let confidenceWithoutProvenance = 0;
  const allSources = new Set<string>();

  readings.forEach((reading, index) => {
    const tier = tiers[index];
    if (compareProvenance(tier, bestTier) > 0) bestTier = tier;
    if (compareProvenance(tier, worstTier) < 0) worstTier = tier;
    allSources.add(reading.sourceId);
    if (PROVENANCE_WEIGHT[tier] >= CORROBORATION_FLOOR) {
      qualifiedSources.add(reading.sourceId);
    }
    if (tier === 'unknown') {
      unknownCount += 1;
      if (typeof reading.confidence === 'number') confidenceWithoutProvenance += 1;
    }
    if (tier === 'llm') llmCount += 1;
  });

  const independentSources = qualifiedSources.size;
  const corroborated = independentSources >= 2;

  // P2/P6: a força sai da melhor procedência; LLM e unknown nunca afirmam.
  let strength: ClaimStrength;
  let governingTier: ProvenanceTier | null;
  if (bestTier === 'human' || bestTier === 'sensor') {
    strength = 'affirmable';
    governingTier = bestTier;
  } else if (bestTier === 'model') {
    // Modelo determinístico afirma quando outra fonte independente confirma;
    // sozinho, dirige a investigação.
    strength = corroborated ? 'affirmable' : 'investigative';
    governingTier = 'model';
  } else if (bestTier === 'llm') {
    strength = 'investigative';
    governingTier = 'llm';
  } else {
    strength = 'unusable';
    governingTier = null;
  }

  const caveats: ProvenanceCaveat[] = [];

  if (unknownCount > 0) {
    caveats.push({
      code: 'unknown_provenance',
      count: unknownCount,
      detail:
        `${unknownCount} leitura(s) chegaram sem declarar origem. Elas não ` +
        'entram no peso da afirmação e precisam constar em qualquer documento.',
    });
  }

  if (confidenceWithoutProvenance > 0) {
    caveats.push({
      code: 'confidence_without_provenance',
      count: confidenceWithoutProvenance,
      detail:
        `${confidenceWithoutProvenance} leitura(s) trouxeram score de ` +
        'confiança sem declarar origem. Score não substitui procedência: ' +
        'permanecem descartadas.',
    });
  }

  if (llmCount > 0 && strength !== 'investigative') {
    caveats.push({
      code: 'llm_in_evidence',
      count: llmCount,
      detail:
        `${llmCount} leitura(s) vieram de modelo generativo e estão no ` +
        'conjunto. Não sustentam a afirmação — apenas a acompanham.',
    });
  }

  if (bestTier === 'llm') {
    caveats.push({
      code: 'llm_only',
      count: llmCount,
      detail:
        'A leitura mais forte disponível é de modelo generativo. Modelos ' +
        'generativos alucinam texto pequeno com aparência de certeza: use ' +
        'como pista e confirme na origem antes de qualquer afirmação.',
    });
  }

  if (bestTier === 'model' && !corroborated) {
    caveats.push({
      code: 'uncorroborated_model',
      count: 1,
      detail:
        'Apenas uma fonte independente qualificada sustenta a leitura. Falta ' +
        'corroboração de fonte distinta para afirmá-la.',
    });
  }

  if (allSources.size === 1 && readings.length > 1) {
    caveats.push({
      code: 'single_source',
      count: readings.length,
      detail:
        `As ${readings.length} leituras vêm da mesma fonte (${[...allSources][0]}). ` +
        'Repetição da mesma fonte não é corroboração.',
    });
  }

  return {
    strength,
    bestTier,
    worstTier,
    governingTier,
    independentSources,
    corroborated,
    readingCount: readings.length,
    caveats,
    summary: buildSummary(strength, governingTier, worstTier, independentSources),
  };
}

function buildSummary(
  strength: ClaimStrength,
  governingTier: ProvenanceTier | null,
  worstTier: ProvenanceTier,
  independentSources: number,
): string {
  if (strength === 'unusable') {
    return 'Origem não declarada: a leitura não sustenta afirmação alguma.';
  }
  const governing = governingTier ? PROVENANCE_LABEL[governingTier].toLowerCase() : '—';
  const base =
    strength === 'affirmable'
      ? `Afirmável com base em ${governing}`
      : `Somente investigativo, com base em ${governing}`;
  const sources =
    independentSources >= 2
      ? `, corroborado por ${independentSources} fontes independentes`
      : independentSources === 1
        ? ', sem corroboração independente'
        : '';
  const disclosure =
    worstTier === 'unknown' || worstTier === 'llm'
      ? ` (há leituras de menor peso no conjunto: ${PROVENANCE_LABEL[worstTier].toLowerCase()})`
      : '';
  return `${base}${sources}${disclosure}.`;
}
