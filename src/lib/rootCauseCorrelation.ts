/**
 * Onda 116 — Correlação automática de causa raiz do backlog da partição DEFAULT.
 *
 * Contexto do problema:
 * as ondas anteriores produzem sintomas isolados. A Onda 113 diz "o backlog da
 * DEFAULT de `plate_detections` cresce 900 linhas/h e satura em 18h". A Onda 112
 * diz "as câmeras A, C e F estão com o relógio errado". A Onda 109 diz "o
 * resíduo da DEFAULT é 82% do bucket `pre_2000`". Três verdades soltas que o
 * operador precisa costurar de cabeça, às 3 da manhã, sob pressão.
 *
 * Este módulo faz a costura: atribui o crescimento do backlog às câmeras
 * culpadas, com uma razão de contribuição por câmera e um resíduo explícito
 * daquilo que NÃO se explica pelo relógio. O resíduo é tão importante quanto a
 * atribuição — declarar "culpado encontrado" quando 70% do backlog vem de outra
 * origem é pior do que não correlacionar nada, porque encerra a investigação
 * cedo demais.
 *
 * Princípio de projeto (idêntico às Ondas 112/113/114): esta é a ÚNICA fonte de
 * verdade da correlação. O SQL coleta fatos brutos; o gate de CI e a UI
 * importam daqui. Nenhuma regra é reimplementada em PL/pgSQL.
 *
 * A função é pura e determinística: mesma entrada ⇒ mesma saída, sem relógio
 * implícito (o `nowMs` é injetado) e sem dependência de ordem de chegada.
 */

/** Severidade do veredito de correlação por tabela pai. */
export type CorrelationVerdict =
  'no_backlog' | 'attributed' | 'partial' | 'unexplained' | 'insufficient_data';

/** Confiança na imputação de uma câmera específica. */
export type CulpritConfidence = 'low' | 'medium' | 'high';

/** Assinatura temporal do resíduo, herdada da triagem da Onda 109. */
export interface QuarantineBuckets {
  /** Linhas com carimbo anterior a 2000-01-01 (RTC de fábrica / bateria morta). */
  readonly pre2000: number;
  /** Linhas com carimbo muito à frente do presente. */
  readonly future: number;
  /** Linhas em janela plausível, porém sem partição criada (falha de manutenção). */
  readonly recentGap: number;
  /** Resíduo não classificável. */
  readonly unknown: number;
}

export const EMPTY_BUCKETS: QuarantineBuckets = {
  pre2000: 0,
  future: 0,
  recentGap: 0,
  unknown: 0,
};

/** Achado de relógio reduzido ao necessário — compatível com a Onda 112. */
export interface SkewFindingLike {
  readonly cameraId: string;
  readonly cameraName?: string | null;
  /** Tabela particionada afetada (`plate_detections`, `recognition_logs`, ...). */
  readonly sourceTable: string;
  readonly severity: 'insufficient_data' | 'ok' | 'warning' | 'critical';
  readonly direction: 'none' | 'ahead' | 'behind';
  readonly sampleCount: number;
  readonly medianSkewSeconds: number;
  /** Linhas-sentinela (carimbo absurdo) atribuídas a esta câmera na janela. */
  readonly sentinelRows: number;
  /** Instante do achado, em ms epoch. */
  readonly detectedAtMs: number;
  /** Achado silenciado manualmente pelo operador. */
  readonly suppressed?: boolean;
}

/** Crescimento observado do backlog de um pai particionado (Onda 113). */
export interface BacklogGrowthLike {
  readonly parent: string;
  /** Linhas acumuladas na DEFAULT no instante mais recente. */
  readonly currentRows: number;
  /** Linhas adicionadas na janela de análise. Negativo ⇒ houve dreno. */
  readonly rowsAddedInWindow: number;
  /** Duração da janela em horas. Zero/negativo ⇒ amostragem insuficiente. */
  readonly windowHours: number;
  /** Buckets da triagem mais recente para este pai. */
  readonly buckets?: QuarantineBuckets;
}

export interface RootCauseThresholds {
  /** Crescimento abaixo disso na janela é ruído operacional, não incidente. */
  readonly minRowsAdded: number;
  /** Achado de relógio mais velho que isto perde confiança (dados rançosos). */
  readonly staleHours: number;
  /** Fração atribuída a partir da qual o incidente é considerado explicado. */
  readonly attributedRatio: number;
  /** Abaixo desta fração atribuída o incidente é declarado inexplicado. */
  readonly unexplainedRatio: number;
  /** Amostras mínimas no achado de relógio para confiança alta. */
  readonly minSamplesForHighConfidence: number;
}

export const DEFAULT_ROOT_CAUSE_THRESHOLDS: RootCauseThresholds = {
  minRowsAdded: 100,
  // Alinhado ao cron diário do detector de relógio (Onda 112) com folga de 2x:
  // um achado de 48h ainda descreve o hardware, mas já não descreve o agora.
  staleHours: 48,
  attributedRatio: 0.7,
  unexplainedRatio: 0.3,
  minSamplesForHighConfidence: 20,
};

export interface RootCauseInput {
  readonly nowMs: number;
  readonly growth: readonly BacklogGrowthLike[];
  readonly skewFindings: readonly SkewFindingLike[];
  readonly thresholds?: RootCauseThresholds;
}

export interface CulpritAttribution {
  readonly cameraId: string;
  readonly cameraName: string | null;
  /** Peso bruto usado no rateio (linhas-sentinela ponderadas pela severidade). */
  readonly weight: number;
  /** Fração do crescimento imputada a esta câmera, em [0, 1]. */
  readonly contributionRatio: number;
  /** Linhas estimadas imputadas a esta câmera na janela. */
  readonly estimatedRows: number;
  readonly confidence: CulpritConfidence;
  readonly reasons: readonly string[];
}

export interface RootCauseCorrelation {
  readonly parent: string;
  readonly verdict: CorrelationVerdict;
  readonly rowsAddedInWindow: number;
  readonly windowHours: number;
  /** Soma das contribuições imputadas, em [0, 1]. */
  readonly attributedRatio: number;
  /** Complemento de `attributedRatio`: o que permanece sem dono. */
  readonly unexplainedRatio: number;
  readonly culprits: readonly CulpritAttribution[];
  /** Ação sugerida ao operador, em PT-BR, pronta para a UI e o alerta. */
  readonly recommendation: string;
  readonly reasons: readonly string[];
}

const HOUR_MS = 3_600_000;

/** Peso por severidade: crítico pesa mais no rateio do que aviso. */
const SEVERITY_WEIGHT: Record<SkewFindingLike['severity'], number> = {
  insufficient_data: 0,
  ok: 0,
  warning: 1,
  critical: 3,
};

function ageHours(nowMs: number, atMs: number): number {
  // Relógio do banco pode recuar (NTP step): idade negativa vira 0 em vez de
  // "achado do futuro", que faria um dado novo parecer infinitamente fresco.
  return Math.max(0, (nowMs - atMs) / HOUR_MS);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Coerência entre a direção do desvio da câmera e a assinatura temporal do
 * resíduo. Uma câmera atrasada explica bucket `pre_2000`; uma adiantada explica
 * `future`. Quando a assinatura bate, a imputação deixa de ser mera
 * coincidência temporal e vira evidência causal.
 */
function signatureMatches(
  direction: SkewFindingLike['direction'],
  buckets: QuarantineBuckets
): boolean {
  if (direction === 'behind') return buckets.pre2000 > 0;
  if (direction === 'ahead') return buckets.future > 0;
  return false;
}

function resolveConfidence(
  finding: SkewFindingLike,
  buckets: QuarantineBuckets,
  stale: boolean,
  thresholds: RootCauseThresholds
): { confidence: CulpritConfidence; reasons: string[] } {
  const reasons: string[] = [];
  let level: 0 | 1 | 2 = 0;

  if (finding.severity === 'critical') {
    level = 1;
    reasons.push('desvio de relógio crítico');
  } else {
    reasons.push('desvio de relógio em nível de aviso');
  }

  if (signatureMatches(finding.direction, buckets)) {
    level = 2;
    reasons.push(
      finding.direction === 'behind'
        ? 'assinatura temporal coerente (resíduo anterior a 2000)'
        : 'assinatura temporal coerente (resíduo no futuro)'
    );
  }

  if (finding.sampleCount < thresholds.minSamplesForHighConfidence && level === 2) {
    // Assinatura bate, mas com poucas amostras a mediana é frágil.
    level = 1;
    reasons.push('amostragem reduzida rebaixou a confiança');
  }

  if (stale) {
    // Rebaixamento monotônico: dado velho nunca sobe a confiança.
    level = level > 0 ? ((level - 1) as 0 | 1) : 0;
    reasons.push('achado de relógio desatualizado');
  }

  const confidence: CulpritConfidence = level === 2 ? 'high' : level === 1 ? 'medium' : 'low';
  return { confidence, reasons };
}

function correlateParent(
  growth: BacklogGrowthLike,
  skewFindings: readonly SkewFindingLike[],
  nowMs: number,
  thresholds: RootCauseThresholds
): RootCauseCorrelation {
  const buckets = growth.buckets ?? EMPTY_BUCKETS;
  const rowsAdded = Number.isFinite(growth.rowsAddedInWindow) ? growth.rowsAddedInWindow : 0;
  const base = {
    parent: growth.parent,
    rowsAddedInWindow: rowsAdded,
    windowHours: growth.windowHours,
    culprits: [] as readonly CulpritAttribution[],
    attributedRatio: 0,
    unexplainedRatio: 1,
  };

  if (growth.windowHours <= 0) {
    return {
      ...base,
      verdict: 'insufficient_data',
      unexplainedRatio: 0,
      recommendation: 'Aguardar novas amostras do coletor de backlog antes de correlacionar.',
      reasons: ['janela de amostragem inválida ou vazia'],
    };
  }

  if (rowsAdded < thresholds.minRowsAdded) {
    return {
      ...base,
      verdict: 'no_backlog',
      unexplainedRatio: 0,
      recommendation: 'Nenhuma ação necessária: o backlog não cresceu de forma relevante.',
      reasons: [
        rowsAdded <= 0
          ? 'backlog estável ou drenando na janela'
          : `crescimento de ${rowsAdded} linhas abaixo do limiar de ${thresholds.minRowsAdded}`,
      ],
    };
  }

  const candidates = skewFindings.filter(
    (f) =>
      f.sourceTable === growth.parent &&
      f.suppressed !== true &&
      SEVERITY_WEIGHT[f.severity] > 0 &&
      f.sentinelRows > 0
  );

  const weighted = candidates.map((finding) => {
    const stale = ageHours(nowMs, finding.detectedAtMs) > thresholds.staleHours;
    const { confidence, reasons } = resolveConfidence(finding, buckets, stale, thresholds);
    // Peso = linhas-sentinela × severidade. Usar linhas-sentinela (e não o
    // tamanho do desvio) mantém o rateio proporcional ao dano real causado à
    // partição, não à gravidade teórica do relógio.
    const weight = Math.max(0, finding.sentinelRows) * SEVERITY_WEIGHT[finding.severity];
    return { finding, weight, confidence, reasons, stale };
  });

  const totalWeight = weighted.reduce((acc, item) => acc + item.weight, 0);

  if (totalWeight <= 0) {
    return {
      ...base,
      verdict: 'unexplained',
      recommendation:
        'Nenhuma câmera com relógio descalibrado explica este crescimento. Investigar a triagem da quarentena e a cobertura de partições futuras.',
      reasons: ['crescimento relevante sem câmera candidata'],
    };
  }

  // Teto de atribuição: a soma das linhas-sentinela não pode imputar mais do
  // que o backlog realmente cresceu. Sem este teto, uma janela de detecção mais
  // larga que a janela de backlog produziria atribuição > 100%.
  const sentinelTotal = candidates.reduce((acc, f) => acc + Math.max(0, f.sentinelRows), 0);
  const coverage = clamp01(sentinelTotal / rowsAdded);

  const culprits: CulpritAttribution[] = weighted
    .map(({ finding, weight, confidence, reasons }) => {
      const share = weight / totalWeight;
      const contributionRatio = clamp01(share * coverage);
      return {
        cameraId: finding.cameraId,
        cameraName: finding.cameraName ?? null,
        weight,
        contributionRatio,
        estimatedRows: Math.round(contributionRatio * rowsAdded),
        confidence,
        reasons,
      };
    })
    .filter((c) => c.contributionRatio > 0)
    .sort(
      (a, b) =>
        b.contributionRatio - a.contributionRatio ||
        b.weight - a.weight ||
        a.cameraId.localeCompare(b.cameraId)
    );

  const attributedRatio = clamp01(culprits.reduce((acc, c) => acc + c.contributionRatio, 0));
  const unexplainedRatio = clamp01(1 - attributedRatio);

  if (culprits.length === 0) {
    return {
      ...base,
      verdict: 'unexplained',
      recommendation:
        'Candidatas existem, mas nenhuma linha-sentinela cabe na janela do backlog. Reavaliar a janela de coleta.',
      reasons: ['cobertura de linhas-sentinela nula frente ao crescimento'],
    };
  }

  const verdict: CorrelationVerdict =
    attributedRatio >= thresholds.attributedRatio
      ? 'attributed'
      : attributedRatio > thresholds.unexplainedRatio
        ? 'partial'
        : 'unexplained';

  // `culprits[0]` existe: o caso vazio já retornou acima. O fallback mantém a
  // função total sob `noUncheckedIndexedAccess` sem recorrer a asserções.
  const top: CulpritAttribution = culprits[0] ?? {
    cameraId: 'desconhecida',
    cameraName: null,
    weight: 0,
    contributionRatio: 0,
    estimatedRows: 0,
    confidence: 'low',
    reasons: [],
  };
  const label = top.cameraName ? `${top.cameraName}` : `câmera ${top.cameraId.slice(0, 8)}`;
  const pct = (ratio: number) => `${Math.round(ratio * 100)}%`;

  const recommendation =
    verdict === 'attributed'
      ? `Sincronizar o relógio (NTP) de ${culprits.length} câmera(s), começando por ${label} (${pct(top.contributionRatio)} do crescimento).`
      : verdict === 'partial'
        ? `Sincronizar ${label} resolve ${pct(top.contributionRatio)} do problema, mas ${pct(unexplainedRatio)} do crescimento continua sem causa identificada — investigar em paralelo.`
        : `Correlação fraca: apenas ${pct(attributedRatio)} do crescimento tem dono. Tratar como incidente de partição, não de relógio.`;

  return {
    parent: growth.parent,
    verdict,
    rowsAddedInWindow: rowsAdded,
    windowHours: growth.windowHours,
    attributedRatio,
    unexplainedRatio,
    culprits,
    recommendation,
    reasons: [
      `${culprits.length} câmera(s) candidata(s) com relógio descalibrado`,
      `${sentinelTotal} linha(s)-sentinela frente a ${rowsAdded} linha(s) de crescimento`,
    ],
  };
}

/**
 * Correlaciona o crescimento do backlog de cada pai particionado com as câmeras
 * de relógio descalibrado. Retorna uma correlação por pai, em ordem estável
 * (pior veredito primeiro, depois maior crescimento, depois nome do pai).
 */
export function correlateRootCause(input: RootCauseInput): RootCauseCorrelation[] {
  const thresholds = input.thresholds ?? DEFAULT_ROOT_CAUSE_THRESHOLDS;
  const rank: Record<CorrelationVerdict, number> = {
    unexplained: 0,
    partial: 1,
    attributed: 2,
    insufficient_data: 3,
    no_backlog: 4,
  };

  return input.growth
    .map((g) => correlateParent(g, input.skewFindings, input.nowMs, thresholds))
    .sort(
      (a, b) =>
        rank[a.verdict] - rank[b.verdict] ||
        b.rowsAddedInWindow - a.rowsAddedInWindow ||
        a.parent.localeCompare(b.parent)
    );
}

/** Severidade agregada para o barramento de alertas (Onda 110/114). */
export function summarizeRootCause(correlations: readonly RootCauseCorrelation[]): {
  severity: 'ok' | 'warning' | 'critical';
  reason: string;
} {
  const unexplained = correlations.filter((c) => c.verdict === 'unexplained');
  const partial = correlations.filter((c) => c.verdict === 'partial');
  const attributed = correlations.filter((c) => c.verdict === 'attributed');

  if (unexplained.length > 0) {
    return {
      severity: 'critical',
      reason: `${unexplained.length} tabela(s) com backlog crescente e causa raiz desconhecida`,
    };
  }
  if (attributed.length > 0 || partial.length > 0) {
    return {
      severity: 'warning',
      reason: `${attributed.length + partial.length} tabela(s) com backlog atribuído a câmeras com relógio descalibrado`,
    };
  }
  return { severity: 'ok', reason: 'nenhum crescimento de backlog relevante' };
}
