/**
 * Onda 212 — Livro de métricas de latência e custo por câmera.
 *
 * As Ondas 206-211 já decidem *o que rodar*, *quem recebe o frame* e *quem
 * executa*. O que faltava é a prestação de contas: quanto tempo cada leitura
 * demorou, quanto custou, e — sobretudo — **quantos frames foram jogados fora
 * e por quê**. Sem isso, uma câmera que descarta 90% dos frames por
 * `stale_frame` aparece na tela como "saudável", porque tudo que ela de fato
 * executou terminou bem. Essa é a mentira que este módulo existe para impedir.
 *
 * Puro: sem relógio próprio, sem rede, sem temporizador. Recebe `CycleReport`
 * (Onda 211) e devolve um livro imutável. Nenhuma tela recalcula percentil,
 * custo ou taxa de descarte por conta própria.
 *
 * ## Oito leis do livro
 *
 * M1. **Latência é medida, nunca estimada.** Execução sem chamada de executor
 *     não tem duração: registra-se `null`, jamais zero. Zero inventado puxa a
 *     média para baixo e some com o problema.
 *
 * M2. **Descarte é evento de primeira classe.** Todo `FrameDrop` e toda recusa
 *     de cadência entra num balde nomeado. `stale_frame` tem balde próprio
 *     porque é o sintoma nº 1 de câmera que a operação perdeu.
 *
 * M3. **Contabilidade fechada.** `totalDrops` é exatamente a soma dos baldes,
 *     e `admitted = succeeded + failed`. Uma soma que não fecha é bug, não
 *     arredondamento — e o autoteste do módulo prova isso.
 *
 * M4. **Custo é debitado na execução, não na intenção.** Tarefa recusada custa
 *     zero, mas o que ela *teria* custado é registrado como `unitsAvoided`:
 *     essa é a economia que justifica o gate da Onda 206.
 *
 * M5. **Custo do fracasso conta.** Uma identificação que estourou timeout
 *     queimou GPU do mesmo jeito. Debitar só o sucesso subfaturaria justamente
 *     a câmera mais problemática.
 *
 * M6. **Percentil é declarado, nunca fingido.** O digest usa histograma de
 *     baldes de borda fixa e memória constante. Acima do último balde, o valor
 *     é reportado como saturado (`p95Ms = null` + `saturated = true`) em vez de
 *     devolver o teto como se fosse a medida real.
 *
 * M7. **Janela desliza pelo relógio observado e nunca retrocede.** Relógio para
 *     trás não ressuscita amostra expirada nem apaga amostra viva (mesma
 *     disciplina de C5 da Onda 206).
 *
 * M8. **Reset é declarado.** A janela vira num corte explícito e o livro guarda
 *     `rolledOverAt`; contador não se apaga em silêncio por reconfiguração.
 */

import type { FrameDropReason } from './frameBus';
import type { CycleReport } from './pipelineCycle';
import type { ProcessorCapability } from './visionPipeline';

/* ========================================================================== */
/* Digest de latência                                                          */
/* ========================================================================== */

/**
 * Bordas do histograma, em milissegundos. Escolhidas em torno da cadência real
 * (0,3 s rastreio / 2 s identificação): resolução fina onde a operação decide,
 * grossa na cauda onde só importa "está muito ruim".
 */
export const DEFAULT_LATENCY_BUCKETS_MS: readonly number[] = [
  25, 50, 100, 200, 400, 800, 1_600, 3_200, 6_400,
];

export interface LatencyDigest {
  readonly count: number;
  readonly minMs: number | null;
  readonly maxMs: number | null;
  readonly sumMs: number;
  readonly meanMs: number | null;
  /** Mediana aproximada pelo balde. `null` sem amostra. */
  readonly p50Ms: number | null;
  /** p95 aproximado. `null` quando a amostra passou do último balde (M6). */
  readonly p95Ms: number | null;
  /** `true` quando alguma amostra passou do último balde. */
  readonly saturated: boolean;
  /** Contagem por balde; o último índice é o transbordo. */
  readonly buckets: readonly number[];
}

function emptyDigest(bucketCount: number): LatencyDigest {
  return {
    count: 0,
    minMs: null,
    maxMs: null,
    sumMs: 0,
    meanMs: null,
    p50Ms: null,
    p95Ms: null,
    saturated: false,
    /* +1 para o balde de transbordo. */
    buckets: new Array<number>(bucketCount + 1).fill(0),
  };
}

function bucketIndexOf(valueMs: number, edges: readonly number[]): number {
  for (let i = 0; i < edges.length; i += 1) {
    if (valueMs <= edges[i]!) return i;
  }
  return edges.length;
}

/** Adiciona uma amostra. Amostra não-finita é ignorada (M1: não se inventa). */
function observe(digest: LatencyDigest, valueMs: number, edges: readonly number[]): LatencyDigest {
  if (!Number.isFinite(valueMs) || valueMs < 0) return digest;

  const buckets = [...digest.buckets];
  const index = bucketIndexOf(valueMs, edges);
  buckets[index] = (buckets[index] ?? 0) + 1;

  const count = digest.count + 1;
  const sumMs = digest.sumMs + valueMs;

  return {
    count,
    minMs: digest.minMs === null ? valueMs : Math.min(digest.minMs, valueMs),
    maxMs: digest.maxMs === null ? valueMs : Math.max(digest.maxMs, valueMs),
    sumMs,
    meanMs: sumMs / count,
    p50Ms: quantileOf(buckets, count, 0.5, edges),
    p95Ms: quantileOf(buckets, count, 0.95, edges),
    saturated: buckets[edges.length]! > 0,
    buckets,
  };
}

/**
 * M6 — quantil pela borda superior do balde que contém a posição pedida.
 * Cair no balde de transbordo devolve `null`: dizer "6400 ms" quando a medida
 * pode ser 60 s seria mentir com número redondo.
 */
function quantileOf(
  buckets: readonly number[],
  count: number,
  q: number,
  edges: readonly number[]
): number | null {
  if (count === 0) return null;
  const target = Math.ceil(q * count);
  let seen = 0;
  for (let i = 0; i < buckets.length; i += 1) {
    seen += buckets[i]!;
    if (seen >= target) return i < edges.length ? edges[i]! : null;
  }
  return null;
}

/* ========================================================================== */
/* Custo                                                                       */
/* ========================================================================== */

/**
 * Custo relativo por tipo de tarefa, em "unidades de inferência". Não é moeda:
 * é a razão de consumo entre o pipeline barato e o caro, exatamente a razão
 * que o gate da Onda 206 protege. Quem quiser reais multiplica na borda.
 */
export interface CostModel {
  readonly track: number;
  readonly identify: number;
}

export const DEFAULT_COST_MODEL: CostModel = { track: 1, identify: 12 };

export interface CostLedger {
  readonly trackRuns: number;
  readonly identifyRuns: number;
  /** Unidades efetivamente gastas — inclui fracassos (M5). */
  readonly unitsSpent: number;
  /** Unidades que as recusas do gate pouparam (M4). */
  readonly unitsAvoided: number;
}

const ZERO_COST: CostLedger = {
  trackRuns: 0,
  identifyRuns: 0,
  unitsSpent: 0,
  unitsAvoided: 0,
};

/* ========================================================================== */
/* Baldes de descarte                                                          */
/* ========================================================================== */

/**
 * Motivos de descarte auditados. Reúne os do barramento (Onda 207) e os da
 * cadência (Onda 206) num vocabulário único — a operação não deve precisar
 * saber qual camada jogou o frame fora para entender que ele se perdeu.
 */
export type DropBucket =
  | FrameDropReason
  /* recusas da cadência / do contrato */
  | 'stale_frame'
  | 'no_activity'
  | 'track_interval'
  | 'quarantined'
  | 'capability_missing'
  | 'cadence_skip'
  | 'cadence_downgrade';

export const DROP_BUCKETS: readonly DropBucket[] = [
  'out_of_order',
  'no_consumers',
  'stale',
  'interval',
  'superseded',
  'consumer_refused',
  'unknown_consumer',
  'detached',
  'foreign_completion',
  'stale_frame',
  'no_activity',
  'track_interval',
  'quarantined',
  'capability_missing',
  'cadence_skip',
  'cadence_downgrade',
];

export type DropCounts = Readonly<Record<DropBucket, number>>;

function zeroDrops(): DropCounts {
  const counts = {} as Record<DropBucket, number>;
  for (const bucket of DROP_BUCKETS) counts[bucket] = 0;
  return counts;
}

/* ========================================================================== */
/* Métricas por câmera                                                         */
/* ========================================================================== */

export interface CameraMetrics {
  readonly cameraId: string;
  /** Início da janela corrente (M7). */
  readonly windowStartMs: number;
  /** Maior instante já observado. Guarda anti-retrocesso. */
  readonly clockFloorMs: number;
  /** Última virada de janela declarada, se houve (M8). */
  readonly rolledOverAtMs: number | null;
  readonly cycles: number;
  readonly framesSeen: number;
  readonly admitted: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly late: number;
  readonly cascaded: number;
  readonly cascadeCapped: number;
  readonly executorMissing: number;
  readonly executorThrew: number;
  readonly cost: CostLedger;
  readonly drops: DropCounts;
  readonly totalDrops: number;
  /** Captura → chamada do executor. Mede fila, não trabalho. */
  readonly queueLatency: LatencyDigest;
  /** Duração da chamada do executor. Mede o modelo. */
  readonly executionLatency: LatencyDigest;
  /** Captura → baixa. É o que o operador sente. */
  readonly totalLatency: LatencyDigest;
}

export interface MetricsConfig {
  readonly buckets: readonly number[];
  readonly cost: CostModel;
  /** Duração da janela de auditoria. `null` = livro acumulativo. */
  readonly windowMs: number | null;
}

export const DEFAULT_METRICS_CONFIG: MetricsConfig = {
  buckets: DEFAULT_LATENCY_BUCKETS_MS,
  cost: DEFAULT_COST_MODEL,
  windowMs: 300_000,
};

export function createCameraMetrics(
  cameraId: string,
  startedAtMs: number,
  config: MetricsConfig = DEFAULT_METRICS_CONFIG
): CameraMetrics {
  const digest = emptyDigest(config.buckets.length);
  return {
    cameraId,
    windowStartMs: startedAtMs,
    clockFloorMs: startedAtMs,
    rolledOverAtMs: null,
    cycles: 0,
    framesSeen: 0,
    admitted: 0,
    succeeded: 0,
    failed: 0,
    late: 0,
    cascaded: 0,
    cascadeCapped: 0,
    executorMissing: 0,
    executorThrew: 0,
    cost: ZERO_COST,
    drops: zeroDrops(),
    totalDrops: 0,
    queueLatency: digest,
    executionLatency: digest,
    totalLatency: digest,
  };
}

function costOf(kind: ProcessorCapability, model: CostModel): number {
  return kind === 'identify' ? model.identify : model.track;
}

/* ========================================================================== */
/* Ingestão                                                                    */
/* ========================================================================== */

/**
 * Absorve um ciclo. Determinístico e imutável: o mesmo relatório aplicado ao
 * mesmo livro produz sempre o mesmo livro seguinte.
 */
export function recordCycle(
  metrics: CameraMetrics,
  report: CycleReport,
  config: MetricsConfig = DEFAULT_METRICS_CONFIG
): CameraMetrics {
  /* M7 — o relógio do livro nunca anda para trás. */
  const nowMs = Math.max(metrics.clockFloorMs, report.completedAtMs);

  /* M7/M8 — janela vencida vira num corte declarado, preservando a âncora. */
  const base =
    config.windowMs !== null && nowMs - metrics.windowStartMs >= config.windowMs
      ? {
          ...createCameraMetrics(metrics.cameraId, nowMs, config),
          rolledOverAtMs: nowMs,
        }
      : metrics;

  const drops: Record<DropBucket, number> = { ...base.drops };
  let totalDrops = base.totalDrops;

  /* M2 — descarte do barramento. */
  for (const drop of report.busDrops) {
    drops[drop.reason] += 1;
    totalDrops += 1;
  }

  let unitsAvoided = base.cost.unitsAvoided;

  /* M2/M4 — recusa do contrato: descarte contado e economia registrada. */
  for (const refusal of report.refusals) {
    drops[refusal.reason] += 1;
    totalDrops += 1;
    unitsAvoided += costOf(refusal.kind, config.cost);
  }

  /* M2 — o `skip` da cadência não gera recusa por processador (ninguém foi
   * consultado), mas o frame morreu ali. `stale_frame` precisa aparecer. */
  if (report.decision !== null && report.decision.action === 'skip') {
    const reason = report.decision.reason;
    if (reason === 'stale_frame' || reason === 'no_activity' || reason === 'track_interval') {
      drops[reason] += 1;
      totalDrops += 1;
    }
  }

  let queueLatency = base.queueLatency;
  let executionLatency = base.executionLatency;
  let totalLatency = base.totalLatency;
  let succeeded = base.succeeded;
  let failed = base.failed;
  let late = base.late;
  let executorMissing = base.executorMissing;
  let executorThrew = base.executorThrew;
  let trackRuns = base.cost.trackRuns;
  let identifyRuns = base.cost.identifyRuns;
  let unitsSpent = base.cost.unitsSpent;

  for (const execution of report.executions) {
    if (execution.outcome === 'success') succeeded += 1;
    else failed += 1;
    if (execution.late) late += 1;
    if (execution.failure === 'executor_missing') executorMissing += 1;
    if (execution.failure === 'executor_threw') executorThrew += 1;

    /* M4/M5 — só a execução que de fato chamou o executor queimou recurso;
     * ter chamado e falhado continua sendo gasto. */
    if (execution.startedAtMs !== null) {
      if (execution.task.kind === 'identify') identifyRuns += 1;
      else trackRuns += 1;
      unitsSpent += costOf(execution.task.kind, config.cost);
    }

    if (execution.queueLatencyMs !== null) {
      queueLatency = observe(queueLatency, execution.queueLatencyMs, config.buckets);
    }
    if (execution.executionMs !== null) {
      executionLatency = observe(executionLatency, execution.executionMs, config.buckets);
    }
    totalLatency = observe(totalLatency, execution.totalLatencyMs, config.buckets);
  }

  return {
    ...base,
    clockFloorMs: nowMs,
    cycles: base.cycles + 1,
    framesSeen: base.framesSeen + 1,
    admitted: base.admitted + report.admitted,
    succeeded,
    failed,
    late,
    cascaded: base.cascaded + report.cascaded,
    cascadeCapped: base.cascadeCapped + report.cascadeCapped,
    executorMissing,
    executorThrew,
    cost: { trackRuns, identifyRuns, unitsSpent, unitsAvoided },
    drops,
    totalDrops,
    queueLatency,
    executionLatency,
    totalLatency,
  };
}

/* ========================================================================== */
/* Livro da frota                                                              */
/* ========================================================================== */

export type MetricsLedger = Readonly<Record<string, CameraMetrics>>;

/** Absorve um ciclo no livro da frota, criando a câmera se for a primeira vez. */
export function recordFleetCycle(
  ledger: MetricsLedger,
  report: CycleReport,
  config: MetricsConfig = DEFAULT_METRICS_CONFIG
): MetricsLedger {
  const current =
    ledger[report.cameraId] ?? createCameraMetrics(report.cameraId, report.tickAtMs, config);
  return { ...ledger, [report.cameraId]: recordCycle(current, report, config) };
}

/* ========================================================================== */
/* Leitura para a tela                                                         */
/* ========================================================================== */

/** Veredito de custo/latência. Eixo independente da saúde (herda F4 da 209). */
export type MetricsVerdict = 'unknown' | 'nominal' | 'strained' | 'critical';

const VERDICT_RANK: Readonly<Record<MetricsVerdict, number>> = {
  nominal: 0,
  unknown: 1,
  strained: 2,
  critical: 3,
};

export function metricsVerdictRank(verdict: MetricsVerdict): number {
  return VERDICT_RANK[verdict];
}

export interface MetricsThresholds {
  /** Acima disto a latência total é tensão. */
  readonly strainedLatencyMs: number;
  /** Acima disto é crítico. */
  readonly criticalLatencyMs: number;
  /** Fração de descarte por frame vista que caracteriza tensão. */
  readonly strainedDropRatio: number;
  readonly criticalDropRatio: number;
}

export const DEFAULT_METRICS_THRESHOLDS: MetricsThresholds = {
  strainedLatencyMs: 800,
  criticalLatencyMs: 2_000,
  strainedDropRatio: 0.3,
  criticalDropRatio: 0.6,
};

export interface CameraMetricsView {
  readonly cameraId: string;
  readonly verdict: MetricsVerdict;
  readonly framesSeen: number;
  readonly admitted: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly late: number;
  /** Descartes por frame observado. `null` sem frame. */
  readonly dropRatio: number | null;
  readonly totalDrops: number;
  /** O balde que a operação mais precisa ver (M2). */
  readonly staleFrameDrops: number;
  readonly staleBusDrops: number;
  readonly drops: DropCounts;
  readonly p50TotalLatencyMs: number | null;
  readonly p95TotalLatencyMs: number | null;
  readonly maxTotalLatencyMs: number | null;
  readonly latencySaturated: boolean;
  readonly p95ExecutionMs: number | null;
  readonly p95QueueMs: number | null;
  readonly cost: CostLedger;
  /** Unidades por frame observado. `null` sem frame. */
  readonly unitsPerFrame: number | null;
  /** Fração do custo que o gate poupou. `null` quando nada foi decidido. */
  readonly savingsRatio: number | null;
  readonly headline: string;
}

function verdictOf(
  metrics: CameraMetrics,
  dropRatio: number | null,
  thresholds: MetricsThresholds
): MetricsVerdict {
  /* Sem execução e sem descarte, nada foi observado: `unknown`, não `nominal`.
   * (Mesma lei da Onda 209: ausência jamais é saúde.) */
  if (metrics.totalLatency.count === 0 && metrics.totalDrops === 0) return 'unknown';

  /* Latência saturada é crítica por definição: passou do último balde, e não
   * temos o direito de chamar de "tensa" o que nem conseguimos medir. */
  if (metrics.totalLatency.saturated) return 'critical';

  const p95 = metrics.totalLatency.p95Ms;
  if (p95 !== null && p95 >= thresholds.criticalLatencyMs) return 'critical';
  if (dropRatio !== null && dropRatio >= thresholds.criticalDropRatio) return 'critical';
  if (p95 !== null && p95 >= thresholds.strainedLatencyMs) return 'strained';
  if (dropRatio !== null && dropRatio >= thresholds.strainedDropRatio) return 'strained';
  return 'nominal';
}

function headlineOf(view: Omit<CameraMetricsView, 'headline'>): string {
  if (view.verdict === 'unknown') return 'Sem leitura na janela';
  const latency =
    view.p95TotalLatencyMs === null
      ? view.latencySaturated
        ? 'latência acima da régua'
        : 'latência não medida'
      : `p95 ${Math.round(view.p95TotalLatencyMs)} ms`;
  const stale = view.staleFrameDrops + view.staleBusDrops;
  const staleText = stale > 0 ? `, ${stale} frame(s) velho(s) descartado(s)` : '';
  return `${latency}${staleText}`;
}

export function viewCameraMetrics(
  metrics: CameraMetrics,
  thresholds: MetricsThresholds = DEFAULT_METRICS_THRESHOLDS
): CameraMetricsView {
  const dropRatio = metrics.framesSeen > 0 ? metrics.totalDrops / metrics.framesSeen : null;
  const totalCost = metrics.cost.unitsSpent + metrics.cost.unitsAvoided;

  const partial: Omit<CameraMetricsView, 'headline'> = {
    cameraId: metrics.cameraId,
    verdict: verdictOf(metrics, dropRatio, thresholds),
    framesSeen: metrics.framesSeen,
    admitted: metrics.admitted,
    succeeded: metrics.succeeded,
    failed: metrics.failed,
    late: metrics.late,
    dropRatio,
    totalDrops: metrics.totalDrops,
    staleFrameDrops: metrics.drops.stale_frame,
    staleBusDrops: metrics.drops.stale,
    drops: metrics.drops,
    p50TotalLatencyMs: metrics.totalLatency.p50Ms,
    p95TotalLatencyMs: metrics.totalLatency.p95Ms,
    maxTotalLatencyMs: metrics.totalLatency.maxMs,
    latencySaturated: metrics.totalLatency.saturated,
    p95ExecutionMs: metrics.executionLatency.p95Ms,
    p95QueueMs: metrics.queueLatency.p95Ms,
    cost: metrics.cost,
    unitsPerFrame: metrics.framesSeen > 0 ? metrics.cost.unitsSpent / metrics.framesSeen : null,
    savingsRatio: totalCost > 0 ? metrics.cost.unitsAvoided / totalCost : null,
  };

  return { ...partial, headline: headlineOf(partial) };
}

export interface FleetMetricsView {
  readonly cameras: readonly CameraMetricsView[];
  readonly verdict: MetricsVerdict;
  readonly framesSeen: number;
  readonly totalDrops: number;
  readonly staleDrops: number;
  readonly unitsSpent: number;
  readonly unitsAvoided: number;
  readonly counts: Readonly<Record<MetricsVerdict, number>>;
}

/**
 * Retrato da frota. Ordem determinística: pior primeiro, empate por `cameraId`
 * (F6 da Onda 209). O veredito da frota é o pior — nunca a média, que é
 * exatamente o que esconde a câmera quebrada entre 59 saudáveis.
 */
export function viewFleetMetrics(
  ledger: MetricsLedger,
  thresholds: MetricsThresholds = DEFAULT_METRICS_THRESHOLDS
): FleetMetricsView {
  const cameras = Object.keys(ledger)
    .sort()
    .map((id) => viewCameraMetrics(ledger[id]!, thresholds))
    .sort((a, b) => {
      const delta = VERDICT_RANK[b.verdict] - VERDICT_RANK[a.verdict];
      return delta !== 0 ? delta : a.cameraId.localeCompare(b.cameraId);
    });

  const counts: Record<MetricsVerdict, number> = {
    unknown: 0,
    nominal: 0,
    strained: 0,
    critical: 0,
  };

  let verdict: MetricsVerdict = cameras.length === 0 ? 'unknown' : 'nominal';
  let framesSeen = 0;
  let totalDrops = 0;
  let staleDrops = 0;
  let unitsSpent = 0;
  let unitsAvoided = 0;

  for (const camera of cameras) {
    counts[camera.verdict] += 1;
    if (VERDICT_RANK[camera.verdict] > VERDICT_RANK[verdict]) verdict = camera.verdict;
    framesSeen += camera.framesSeen;
    totalDrops += camera.totalDrops;
    staleDrops += camera.staleFrameDrops + camera.staleBusDrops;
    unitsSpent += camera.cost.unitsSpent;
    unitsAvoided += camera.cost.unitsAvoided;
  }

  return {
    cameras,
    verdict,
    framesSeen,
    totalDrops,
    staleDrops,
    unitsSpent,
    unitsAvoided,
    counts,
  };
}

/* ========================================================================== */
/* Autoteste de contabilidade (M3)                                             */
/* ========================================================================== */

/**
 * Prova que o livro fecha. Devolve a lista de violações — vazia é o esperado.
 * Exposto porque a auditoria em tempo real não vale nada se a soma não bate.
 */
export function auditMetrics(metrics: CameraMetrics): readonly string[] {
  const violations: string[] = [];

  const bucketSum = DROP_BUCKETS.reduce((acc, b) => acc + metrics.drops[b], 0);
  if (bucketSum !== metrics.totalDrops) {
    violations.push(`totalDrops ${metrics.totalDrops} ≠ soma dos baldes ${bucketSum}`);
  }
  if (metrics.succeeded + metrics.failed !== metrics.totalLatency.count) {
    violations.push('desfechos não batem com amostras de latência total');
  }
  if (metrics.cost.trackRuns + metrics.cost.identifyRuns !== metrics.executionLatency.count) {
    violations.push('execuções cobradas não batem com amostras de duração');
  }
  for (const digest of [metrics.queueLatency, metrics.executionLatency, metrics.totalLatency]) {
    const sum = digest.buckets.reduce((acc, n) => acc + n, 0);
    if (sum !== digest.count) violations.push('histograma não fecha com a contagem');
    if (digest.count === 0 && digest.meanMs !== null) {
      violations.push('média sem amostra');
    }
  }
  return violations;
}
