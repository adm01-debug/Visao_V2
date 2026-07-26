/**
 * Onda 113 — Política pura de tendência e projeção de saturação do backlog da
 * partição DEFAULT.
 *
 * Motivação: as Ondas 108 (drenagem) e 109 (triagem) sabem responder "quanto há
 * na DEFAULT agora?" e "que tipo de lixo é esse?". Nenhuma das duas responde a
 * pergunta que realmente antecede um incidente: **em quanto tempo isso satura?**
 * Um balde de contingência com 2.000 linhas estáveis é irrelevante; um com 2.000
 * linhas crescendo 400/h queima o orçamento de I/O da manutenção em dois dias.
 *
 * A regra abaixo é pura e determinística de propósito: é a mesma consumida pela
 * rotina SQL `public.analyze_partition_backlog_trend`, pelo gate de CI
 * `db:check:backlog-trend` e pelo card da OperationsPage. Uma única fonte de
 * verdade evita o clássico "a UI diz OK e o alerta diz crítico".
 */

/** Severidade final de um pai particionado. */
export type BacklogSeverity = 'ok' | 'warning' | 'critical';

/** Direção da série temporal, independente da severidade. */
export type BacklogTrend =
  /** Amostras insuficientes para estimar inclinação. */
  | 'unknown'
  /** Inclinação negativa relevante: a drenagem está ganhando da entrada. */
  | 'draining'
  /** Inclinação praticamente nula dentro da banda morta. */
  | 'stable'
  /** Inclinação positiva relevante: a DEFAULT está enchendo. */
  | 'growing';

/** Limiares configuráveis. Os defaults são os aplicados em produção. */
export interface BacklogTrendThresholds {
  /** Amostras mínimas para estimar inclinação (pares distintos no tempo). */
  readonly minSamples: number;
  /** Idade máxima da amostra mais recente antes de considerar a série obsoleta. */
  readonly maxSampleAgeHours: number;
  /** Backlog absoluto a partir do qual o estado já é `warning`. */
  readonly warnRows: number;
  /** Backlog absoluto a partir do qual o estado já é `critical`. */
  readonly criticalRows: number;
  /** Capacidade considerada saturada para efeito de projeção. */
  readonly saturationRows: number;
  /** Projeção de saturação abaixo deste horizonte vira `warning`. */
  readonly warnHorizonHours: number;
  /** Projeção de saturação abaixo deste horizonte vira `critical`. */
  readonly criticalHorizonHours: number;
  /** Banda morta (linhas/hora) em que a inclinação é tratada como zero. */
  readonly slopeDeadbandPerHour: number;
}

export const DEFAULT_BACKLOG_TREND_THRESHOLDS: BacklogTrendThresholds = {
  minSamples: 3,
  maxSampleAgeHours: 6,
  warnRows: 10_000,
  criticalRows: 50_000,
  saturationRows: 50_000,
  warnHorizonHours: 72,
  criticalHorizonHours: 24,
  slopeDeadbandPerHour: 1,
};

/** Uma amostra bruta da contagem da partição DEFAULT. */
export interface BacklogSample {
  /** Instante da coleta, em milissegundos epoch. */
  readonly sampledAtMs: number;
  /** Linhas presentes na partição DEFAULT naquele instante. */
  readonly rowCount: number;
}

/** Série temporal de um pai particionado. */
export interface BacklogSeries {
  /** Nome do pai particionado, ex.: `plate_detections`. */
  readonly parent: string;
  /** Partição DEFAULT correspondente, ex.: `plate_detections_default`. */
  readonly defaultPartition: string;
  /** Amostras em qualquer ordem; a análise ordena internamente. */
  readonly samples: readonly BacklogSample[];
}

/** Veredito de um pai particionado. */
export interface BacklogVerdict {
  readonly parent: string;
  readonly defaultPartition: string;
  readonly severity: BacklogSeverity;
  readonly trend: BacklogTrend;
  /** Contagem da amostra mais recente. */
  readonly currentRows: number;
  /** Número de amostras utilizáveis. */
  readonly sampleCount: number;
  /** Inclinação robusta (Theil–Sen) em linhas por hora; `null` se indeterminada. */
  readonly slopePerHour: number | null;
  /** Horas até atingir `saturationRows`; `null` quando não há saturação prevista. */
  readonly hoursToSaturation: number | null;
  /** Idade da amostra mais recente, em horas. */
  readonly sampleAgeHours: number | null;
  /** Série obsoleta: o coletor parou de rodar. */
  readonly stale: boolean;
  /** Motivos legíveis (PT-BR), do mais grave ao mais brando. */
  readonly reasons: readonly string[];
}

const HOUR_MS = 3_600_000;

const SEVERITY_RANK: Record<BacklogSeverity, number> = {
  ok: 0,
  warning: 1,
  critical: 2,
};

/** Retorna a maior severidade entre duas. Mantém a monotonicidade do veredito. */
export function maxSeverity(a: BacklogSeverity, b: BacklogSeverity): BacklogSeverity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

/** Mediana numérica. Lança para entrada vazia — chamadores sempre validam antes. */
function median(values: readonly number[]): number {
  if (values.length === 0) {
    throw new Error('median() requer ao menos um valor');
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  const high = sorted[mid] ?? 0;
  if (sorted.length % 2 === 1) return high;
  return ((sorted[mid - 1] ?? high) + high) / 2;
}

/**
 * Estimador de inclinação de Theil–Sen: mediana das inclinações de todos os pares.
 *
 * Escolhido em vez de mínimos quadrados porque a série real tem picos legítimos —
 * uma câmera com relógio quebrado (Onda 112) despeja milhares de linhas de uma vez
 * e depois a drenagem as remove. A regressão linear clássica gira inteira em cima
 * desse outlier e projetaria saturação falsa; a mediana ignora até ~29% de pontos
 * contaminados.
 *
 * Complexidade O(n²): aceitável porque a janela de análise é limitada a poucas
 * centenas de amostras por pai.
 */
export function theilSenSlopePerHour(samples: readonly BacklogSample[]): number | null {
  const slopes: number[] = [];
  for (let i = 0; i < samples.length; i += 1) {
    const a = samples[i];
    if (!a) continue;
    for (let j = i + 1; j < samples.length; j += 1) {
      const b = samples[j];
      if (!b) continue;
      const deltaHours = (b.sampledAtMs - a.sampledAtMs) / HOUR_MS;
      // Amostras com o mesmo carimbo (coletor reexecutado no mesmo instante)
      // gerariam divisão por zero: são descartadas, não tratadas como infinito.
      if (deltaHours === 0) continue;
      slopes.push((b.rowCount - a.rowCount) / deltaHours);
    }
  }
  return slopes.length === 0 ? null : median(slopes);
}

/** Normaliza a série: descarta amostras inválidas e ordena cronologicamente. */
function normalize(samples: readonly BacklogSample[]): BacklogSample[] {
  return samples
    .filter(
      (s) =>
        Number.isFinite(s.sampledAtMs) &&
        Number.isFinite(s.rowCount) &&
        s.rowCount >= 0,
    )
    .sort((a, b) => a.sampledAtMs - b.sampledAtMs);
}

/** Severidade derivada apenas do valor absoluto corrente. */
function levelSeverity(rows: number, t: BacklogTrendThresholds): BacklogSeverity {
  if (rows >= t.criticalRows) return 'critical';
  if (rows >= t.warnRows) return 'warning';
  return 'ok';
}

/** Severidade derivada apenas do horizonte projetado de saturação. */
function horizonSeverity(
  hoursToSaturation: number | null,
  t: BacklogTrendThresholds,
): BacklogSeverity {
  if (hoursToSaturation === null) return 'ok';
  if (hoursToSaturation <= t.criticalHorizonHours) return 'critical';
  if (hoursToSaturation <= t.warnHorizonHours) return 'warning';
  return 'ok';
}

/**
 * Avalia a série de um pai particionado.
 *
 * Invariantes garantidas (verificadas por `simulate:wave113`):
 * - I1  menos de `minSamples` amostras ⇒ `trend = 'unknown'` e nenhuma projeção;
 * - I2  o nível absoluto SEMPRE vale, mesmo sem amostras suficientes ou com série obsoleta;
 * - I3  série obsoleta ⇒ severidade mínima `warning` (o coletor em si está quebrado);
 * - I4  inclinação ≤ 0 ⇒ nunca há projeção de saturação;
 * - I5  severidade é monotônica não-decrescente em `currentRows`;
 * - I6  severidade é monotônica não-decrescente na inclinação;
 * - I7  backlog já ≥ `saturationRows` ⇒ `hoursToSaturation = 0` e `critical`;
 * - I8  função pura: mesma entrada ⇒ mesma saída, sem leitura de relógio global.
 *
 * @param nowMs Instante de referência, injetado para manter a função determinística.
 */
export function evaluateBacklogSeries(
  series: BacklogSeries,
  nowMs: number,
  thresholds: BacklogTrendThresholds = DEFAULT_BACKLOG_TREND_THRESHOLDS,
): BacklogVerdict {
  const samples = normalize(series.samples);
  const reasons: string[] = [];

  if (samples.length === 0) {
    return {
      parent: series.parent,
      defaultPartition: series.defaultPartition,
      severity: 'warning',
      trend: 'unknown',
      currentRows: 0,
      sampleCount: 0,
      slopePerHour: null,
      hoursToSaturation: null,
      sampleAgeHours: null,
      stale: true,
      reasons: ['Nenhuma amostra de backlog coletada para esta tabela.'],
    };
  }

  const latest = samples[samples.length - 1];
  const currentRows = latest.rowCount;
  const sampleAgeHours = Math.max(0, (nowMs - latest.sampledAtMs) / HOUR_MS);
  const stale = sampleAgeHours > thresholds.maxSampleAgeHours;

  const hasEnough = samples.length >= thresholds.minSamples;
  const rawSlope = hasEnough ? theilSenSlopePerHour(samples) : null;

  let trend: BacklogTrend;
  if (rawSlope === null) {
    trend = 'unknown';
  } else if (Math.abs(rawSlope) <= thresholds.slopeDeadbandPerHour) {
    trend = 'stable';
  } else {
    trend = rawSlope > 0 ? 'growing' : 'draining';
  }

  // A projeção só faz sentido com crescimento fora da banda morta. Um backlog que
  // já está acima da capacidade satura "agora" (0h), sem extrapolação.
  let hoursToSaturation: number | null = null;
  if (currentRows >= thresholds.saturationRows) {
    hoursToSaturation = 0;
  } else if (trend === 'growing' && rawSlope !== null && rawSlope > 0) {
    hoursToSaturation = (thresholds.saturationRows - currentRows) / rawSlope;
  }

  let severity = maxSeverity(
    levelSeverity(currentRows, thresholds),
    horizonSeverity(hoursToSaturation, thresholds),
  );

  if (stale) {
    severity = maxSeverity(severity, 'warning');
    reasons.push(
      `Amostra mais recente tem ${sampleAgeHours.toFixed(1)}h (limite ${thresholds.maxSampleAgeHours}h): o coletor de backlog pode estar parado.`,
    );
  }

  if (!hasEnough) {
    reasons.push(
      `Apenas ${samples.length} amostra(s) disponível(is) (mínimo ${thresholds.minSamples}): tendência ainda não estimável.`,
    );
  }

  if (currentRows >= thresholds.criticalRows) {
    reasons.push(
      `Backlog atual de ${currentRows.toLocaleString('pt-BR')} linhas ultrapassa o teto crítico de ${thresholds.criticalRows.toLocaleString('pt-BR')}.`,
    );
  } else if (currentRows >= thresholds.warnRows) {
    reasons.push(
      `Backlog atual de ${currentRows.toLocaleString('pt-BR')} linhas ultrapassa o limite de atenção de ${thresholds.warnRows.toLocaleString('pt-BR')}.`,
    );
  }

  if (hoursToSaturation !== null && hoursToSaturation > 0) {
    reasons.push(
      `No ritmo atual (${rawSlope!.toFixed(1)} linhas/h), a capacidade de ${thresholds.saturationRows.toLocaleString('pt-BR')} linhas é atingida em ${formatHours(hoursToSaturation)}.`,
    );
  }

  if (trend === 'draining' && rawSlope !== null) {
    reasons.push(
      `Backlog em queda de ${Math.abs(rawSlope).toFixed(1)} linhas/h: a drenagem está à frente da entrada.`,
    );
  }

  if (reasons.length === 0) {
    reasons.push('Backlog estável e dentro dos limites operacionais.');
  }

  return {
    parent: series.parent,
    defaultPartition: series.defaultPartition,
    severity,
    trend,
    currentRows,
    sampleCount: samples.length,
    slopePerHour: rawSlope,
    hoursToSaturation,
    sampleAgeHours,
    stale,
    reasons,
  };
}

/** Formata um horizonte em horas para leitura humana em PT-BR. */
export function formatHours(hours: number): string {
  if (!Number.isFinite(hours)) return 'tempo indeterminado';
  if (hours <= 0) return 'agora';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} dias`;
}

/** Rótulo humano da tendência. */
export function describeTrend(trend: BacklogTrend): string {
  switch (trend) {
    case 'draining':
      return 'Drenando';
    case 'stable':
      return 'Estável';
    case 'growing':
      return 'Crescendo';
    default:
      return 'Indeterminada';
  }
}
