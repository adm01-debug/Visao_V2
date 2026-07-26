/**
 * Onda 112 — Política pura de classificação de desvio de relógio (clock skew) por câmera.
 *
 * Motivação: câmeras com RTC descalibrado (bateria fraca, NTP ausente, firmware XM
 * que sobe com 1970/2000) carimbam eventos com data errada. Isso contamina as
 * tabelas particionadas (linhas caem na partição DEFAULT, bucket `pre_2000` da
 * triagem da Onda 109) e distorce relatórios. Antes de "consertar" o dado é
 * preciso isolar o hardware culpado.
 *
 * Esta lógica é pura e determinística de propósito: é a mesma regra executada
 * pela rotina SQL `public.detect_camera_clock_skew`, pelo gate de CI e pela UI.
 */

/** Severidade atribuída a uma câmera após a análise de amostras. */
export type ClockSkewSeverity = 'insufficient_data' | 'ok' | 'warning' | 'critical';

/** Direção do desvio, útil para diferenciar RTC parado de fuso horário errado. */
export type ClockSkewDirection = 'none' | 'ahead' | 'behind';

/** Limiares configuráveis. Os defaults são os aplicados em produção. */
export interface ClockSkewThresholds {
  /** Amostras mínimas para emitir qualquer veredito. */
  readonly minSamples: number;
  /** A partir deste desvio absoluto (segundos) vira `warning`. */
  readonly warnSeconds: number;
  /** A partir deste desvio absoluto (segundos) vira `critical`. */
  readonly criticalSeconds: number;
}

export const DEFAULT_CLOCK_SKEW_THRESHOLDS: ClockSkewThresholds = {
  minSamples: 5,
  warnSeconds: 300,
  criticalSeconds: 3600,
};

/** Agregado bruto de uma câmera, produzido pela rotina SQL. */
export interface CameraSkewSample {
  readonly cameraId: string;
  readonly sampleCount: number;
  /** Mediana de (timestamp do dispositivo − created_at da ingestão), em segundos. */
  readonly medianSkewSeconds: number;
  /** Maior desvio absoluto observado na janela, em segundos. */
  readonly maxAbsSkewSeconds: number;
  /** Linhas com carimbo anterior a 2000-01-01 (RTC de fábrica). */
  readonly sentinelPastRows: number;
  /** Linhas com carimbo muito além do presente (> 30 dias no futuro). */
  readonly sentinelFutureRows: number;
  /** Estado de saúde corrente da câmera, quando conhecido. */
  readonly healthState?: 'online' | 'degraded' | 'offline' | 'unknown' | null;
}

/** Veredito final por câmera. */
export interface ClockSkewFinding {
  readonly cameraId: string;
  readonly severity: ClockSkewSeverity;
  readonly direction: ClockSkewDirection;
  readonly sampleCount: number;
  readonly medianSkewSeconds: number;
  readonly maxAbsSkewSeconds: number;
  readonly sentinelRows: number;
  /**
   * Quando `true`, o achado é real mas não deve gerar alerta externo: a câmera
   * não está online, então o desvio pode ser apenas resíduo de dados antigos.
   * A severidade NÃO é rebaixada — apenas o despacho é suprimido (I8).
   */
  readonly suppressed: boolean;
  readonly reason: string;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * Classifica uma câmera. Invariantes garantidas (validadas por simulação):
 *  I1 amostras < minSamples ⇒ `insufficient_data`, jamais alerta.
 *  I2 |skew| < warn ⇒ `ok`.
 *  I3 warn ≤ |skew| < critical ⇒ `warning`.
 *  I4 |skew| ≥ critical ⇒ `critical`.
 *  I5 qualquer linha sentinela (pré-2000 ou futuro distante) ⇒ `critical`.
 *  I6 severidade é monotônica não-decrescente em |skew|.
 *  I7 sinal do desvio não altera a severidade, apenas a direção reportada.
 *  I8 câmera não-online ⇒ `suppressed = true`, sem rebaixar a severidade.
 */
export function classifyClockSkew(
  sample: CameraSkewSample,
  thresholds: ClockSkewThresholds = DEFAULT_CLOCK_SKEW_THRESHOLDS,
): ClockSkewFinding {
  const minSamples = Math.max(1, thresholds.minSamples);
  const warn = Math.max(1, thresholds.warnSeconds);
  const critical = Math.max(warn + 1, thresholds.criticalSeconds);

  const sampleCount = isFiniteNumber(sample.sampleCount) ? Math.max(0, Math.trunc(sample.sampleCount)) : 0;
  const median = isFiniteNumber(sample.medianSkewSeconds) ? sample.medianSkewSeconds : 0;
  const maxAbsRaw = isFiniteNumber(sample.maxAbsSkewSeconds) ? Math.abs(sample.maxAbsSkewSeconds) : 0;
  // O máximo nunca pode ser menor que a mediana em módulo — protege contra
  // agregados inconsistentes vindos de uma janela parcialmente drenada.
  const maxAbs = Math.max(maxAbsRaw, Math.abs(median));
  const sentinelRows =
    Math.max(0, Math.trunc(sample.sentinelPastRows || 0)) +
    Math.max(0, Math.trunc(sample.sentinelFutureRows || 0));

  const direction: ClockSkewDirection =
    Math.abs(median) < 1 ? 'none' : median > 0 ? 'ahead' : 'behind';
  const suppressed = (sample.healthState ?? 'unknown') !== 'online';

  if (sampleCount < minSamples && sentinelRows === 0) {
    return {
      cameraId: sample.cameraId,
      severity: 'insufficient_data',
      direction,
      sampleCount,
      medianSkewSeconds: median,
      maxAbsSkewSeconds: maxAbs,
      sentinelRows,
      suppressed: true,
      reason: `apenas ${sampleCount} amostra(s) na janela (mínimo ${minSamples})`,
    };
  }

  if (sentinelRows > 0) {
    return {
      cameraId: sample.cameraId,
      severity: 'critical',
      direction,
      sampleCount,
      medianSkewSeconds: median,
      maxAbsSkewSeconds: maxAbs,
      sentinelRows,
      suppressed,
      reason: `${sentinelRows} evento(s) com carimbo impossível — RTC provavelmente sem NTP`,
    };
  }

  const absMedian = Math.abs(median);
  if (absMedian >= critical) {
    return {
      cameraId: sample.cameraId,
      severity: 'critical',
      direction,
      sampleCount,
      medianSkewSeconds: median,
      maxAbsSkewSeconds: maxAbs,
      sentinelRows,
      suppressed,
      reason: `desvio mediano de ${Math.round(absMedian)}s (limite crítico ${critical}s)`,
    };
  }

  if (absMedian >= warn) {
    return {
      cameraId: sample.cameraId,
      severity: 'warning',
      direction,
      sampleCount,
      medianSkewSeconds: median,
      maxAbsSkewSeconds: maxAbs,
      sentinelRows,
      suppressed,
      reason: `desvio mediano de ${Math.round(absMedian)}s (limite de atenção ${warn}s)`,
    };
  }

  return {
    cameraId: sample.cameraId,
    severity: 'ok',
    direction,
    sampleCount,
    medianSkewSeconds: median,
    maxAbsSkewSeconds: maxAbs,
    sentinelRows,
    suppressed,
    reason: `relógio dentro da tolerância (${Math.round(absMedian)}s)`,
  };
}

/** Ordem de gravidade para ordenação estável na UI e no gate. */
export const CLOCK_SKEW_SEVERITY_RANK: Record<ClockSkewSeverity, number> = {
  critical: 3,
  warning: 2,
  ok: 1,
  insufficient_data: 0,
};

/** Formata o desvio em linguagem humana (PT-BR) para a UI e para os relatórios. */
export function formatSkew(seconds: number): string {
  const abs = Math.abs(Math.round(seconds));
  const suffix = seconds > 0 ? ' adiantado' : seconds < 0 ? ' atrasado' : '';
  if (abs < 60) return `${abs}s${suffix}`;
  if (abs < 3600) return `${Math.round(abs / 60)}min${suffix}`;
  if (abs < 86400) return `${(abs / 3600).toFixed(1)}h${suffix}`;
  return `${(abs / 86400).toFixed(1)}d${suffix}`;
}
