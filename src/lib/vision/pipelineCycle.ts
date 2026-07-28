/**
 * Onda 211 — Ciclo executável da câmera (cadência ⨯ FrameBus em um só laço).
 *
 * As Ondas 206-208 entregaram as réguas puras: a cadência decide *o que rodar*,
 * o FrameBus decide *quem recebe o frame* e `visionPipeline` casa as duas na
 * admissão. Ainda faltava o laço: quem executa a tarefa, quem dá baixa, quem
 * garante que nenhuma tarefa admitida fique sem desfecho e que o slot do
 * barramento não vaze quando o executor explode.
 *
 * Este módulo é esse laço — e só ele. Nenhuma decisão nova é tomada aqui: toda
 * admissão continua vindo de `tickPipeline` e todo desfecho continua sendo
 * escrito por `settleTask`. O ciclo apenas orquestra, isola falhas e devolve um
 * relatório fechado.
 *
 * ## Seis leis do ciclo
 *
 * L1. **Um frame, um ciclo.** `tickPipeline` é chamado exatamente uma vez por
 *     frame. Republicar o mesmo frame para "tentar de novo" furaria a ordem
 *     monotônica do barramento (F1 da Onda 207).
 *
 * L2. **Contabilidade fechada.** Toda tarefa admitida no ciclo recebe
 *     exatamente um desfecho registrado. Executor ausente não é silêncio: é
 *     falha declarada (`executor_missing`), que alimenta a escada de quarentena
 *     como qualquer outro fracasso.
 *
 * L3. **Falha isolada nunca contamina.** Exceção ou promessa rejeitada do
 *     executor é capturada e vira `failure`; jamais escapa do ciclo nem impede
 *     o desfecho das demais tarefas do mesmo frame (P3 da Onda 208).
 *
 * L4. **Baixa serializada.** O estado do pipeline é imutável e encadeado: as
 *     baixas acontecem uma por vez, em ordem determinística de admissão. Rodar
 *     `settleTask` em paralelo sobre o mesmo estado descartaria escritas.
 *
 * L5. **Cascata com teto declarado.** Uma baixa pode liberar a pendência do
 *     barramento e gerar nova tarefa de rastreio. Isso é desejado, mas tem teto
 *     (`maxCascade`); estourar o teto é fato contabilizado, nunca laço infinito.
 *
 * L6. **Relógio só avança.** O ciclo lê o relógio a cada transição, e o piso
 *     monotônico de `PipelineState` impede que um relógio retrocedido libere
 *     orçamento ou encurte quarentena (herança da Onda 206).
 */

import {
  settleTask,
  tickPipeline,
  type PipelineRefusal,
  type PipelineState,
  type PipelineTask,
  type TaskOutcome,
} from './visionPipeline';
import type { BusFrame, FrameDrop } from './frameBus';
import type { CadenceDecision, FrameObservation } from './inferenceCadence';

/* ========================================================================== */
/* Contrato do executor                                                        */
/* ========================================================================== */

/**
 * Execução real de uma tarefa. Pode ser síncrona ou assíncrona. Rejeitar ou
 * lançar é permitido e esperado — o ciclo trata (L3).
 */
export type ProcessorExecutor = (task: PipelineTask) => void | Promise<void>;

/** Por que uma execução foi considerada fracasso. `null` = houve sucesso. */
export type ExecutionFailure =
  /** Nenhum executor registrado para o processador admitido (L2). */
  | 'executor_missing'
  /** O executor lançou/rejeitou. */
  | 'executor_threw'
  /** O teto de cascata foi atingido antes de executar (L5). */
  | 'cascade_capped';

export interface CycleExecution {
  readonly task: PipelineTask;
  readonly outcome: TaskOutcome;
  readonly failure: ExecutionFailure | null;
  /** `true` quando a tarefa nasceu de uma baixa, não da publicação do frame. */
  readonly cascaded: boolean;
  /** `true` quando o laudo chegou depois de o processador já ter avançado. */
  readonly late: boolean;
  /** Mensagem do erro capturado, quando houver. Nunca vaza o objeto de erro. */
  readonly errorMessage: string | null;
  /* --- Onda 212: relógios da execução (L7) ----------------------------- */
  /** Instante em que o executor foi chamado. `null` quando não houve chamada. */
  readonly startedAtMs: number | null;
  /** Instante da baixa. Sempre existe: toda tarefa é dada baixa (L2). */
  readonly settledAtMs: number;
  /** Espera entre a captura do frame e a chamada do executor. */
  readonly queueLatencyMs: number | null;
  /** Duração da chamada do executor. `null` quando não houve chamada. */
  readonly executionMs: number | null;
  /** Captura → baixa. A latência que o operador realmente sente. */
  readonly totalLatencyMs: number;
}


export interface CycleOptions {
  /** Executores por `processorId`. Ausência é falha declarada, não silêncio. */
  readonly executors: Readonly<Record<string, ProcessorExecutor>>;
  /** Relógio do ciclo. Lido a cada transição (L6). */
  readonly clock: () => number;
  /** Teto de tarefas nascidas de baixas neste ciclo (L5). */
  readonly maxCascade?: number;
}

export const DEFAULT_MAX_CASCADE = 4;

export interface CycleReport {
  readonly cameraId: string;
  readonly state: PipelineState;
  readonly frameId: number;
  readonly decision: CadenceDecision | null;
  readonly refusals: readonly PipelineRefusal[];
  readonly busDrops: readonly FrameDrop[];
  readonly executions: readonly CycleExecution[];
  /** Tarefas admitidas na publicação do frame. */
  readonly admitted: number;
  /** Tarefas nascidas de baixas (pendência liberada). */
  readonly cascaded: number;
  /** Tarefas recusadas por cascata acima do teto. */
  readonly cascadeCapped: number;
  /** Instante em que o frame entrou no ciclo. Âncora da janela de auditoria. */
  readonly tickAtMs: number;
  /** Instante da última baixa; igual a `tickAtMs` quando nada foi admitido. */
  readonly completedAtMs: number;
}

function errorMessageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'unknown_error';
}

/**
 * L7 — duração observada entre dois instantes, nunca negativa.
 *
 * O relógio do host pode retroceder (NTP) e o `capturedAtMs` do frame vem do
 * equipamento, que pode estar adiantado (a Onda 112 mede exatamente esse
 * desvio). Latência negativa não existe fisicamente e envenenaria qualquer
 * média; então o piso é zero — declarado, não silencioso.
 */
function elapsed(fromMs: number, toMs: number): number {
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return 0;
  return Math.max(0, toMs - fromMs);
}


/* ========================================================================== */
/* Ciclo de uma câmera                                                         */
/* ========================================================================== */

/**
 * Roda o ciclo completo de uma câmera para um frame: publica no barramento,
 * consulta a cadência, executa as tarefas admitidas e dá baixa em todas.
 *
 * O estado devolvido é sempre consistente: nunca há tarefa admitida sem
 * desfecho, nem slot de barramento ocupado por execução que já terminou.
 */
export async function runCameraCycle(
  state: PipelineState,
  frame: BusFrame,
  observation: FrameObservation,
  options: CycleOptions,
): Promise<CycleReport> {
  const maxCascade = options.maxCascade ?? DEFAULT_MAX_CASCADE;

  /* L1 — um único tick por frame. */
  const tick = tickPipeline(state, frame, observation, options.clock());

  let current = tick.state;
  const executions: CycleExecution[] = [];
  const busDrops: FrameDrop[] = [...tick.busDrops];

  /* Fila em ordem de admissão (L4). `cascaded` acompanha a origem da tarefa. */
  const queue: Array<{ task: PipelineTask; cascaded: boolean }> = tick.tasks.map(
    (task) => ({ task, cascaded: false }),
  );

  const admitted = queue.length;
  let cascaded = 0;
  let cascadeCapped = 0;

  while (queue.length > 0) {
    const entry = queue.shift()!;
    const { task } = entry;

    /* L5 — teto atingido: a tarefa não é executada, mas ainda recebe baixa,
     * senão o slot do barramento ficaria ocupado para sempre. */
    if (entry.cascaded && cascaded > maxCascade) {
      cascadeCapped += 1;
      const settledAtMs = options.clock();
      const settled = settleTask(current, task, 'failure', settledAtMs);
      current = settled.state;
      busDrops.push(...settled.busDrops);
      executions.push({
        task,
        outcome: 'failure',
        failure: 'cascade_capped',
        cascaded: true,
        late: settled.late,
        errorMessage: null,
        startedAtMs: null,
        settledAtMs,
        queueLatencyMs: null,
        executionMs: null,
        totalLatencyMs: elapsed(task.capturedAtMs, settledAtMs),
      });
      /* Baixa de tarefa capada não realimenta a fila: seria o mesmo laço. */
      continue;
    }

    const executor = options.executors[task.processorId];
    let outcome: TaskOutcome = 'success';
    let failure: ExecutionFailure | null = null;
    let errorMessage: string | null = null;

    /* L7 — o relógio é lido nas bordas reais da chamada. Sem executor não há
     * chamada, logo não há duração: `null` honesto em vez de zero inventado. */
    let startedAtMs: number | null = null;
    let executionMs: number | null = null;

    if (!executor) {
      /* L2 — ausência é fracasso declarado, não desaparecimento. */
      outcome = 'failure';
      failure = 'executor_missing';
    } else {
      startedAtMs = options.clock();
      try {
        await executor(task);
      } catch (error) {
        /* L3 — isolamento: o erro morre aqui e vira estatística. */
        outcome = 'failure';
        failure = 'executor_threw';
        errorMessage = errorMessageOf(error);
      }
      /* A duração de uma execução que falhou também é custo gasto: medir só o
       * sucesso esconderia justamente o timeout que derruba a câmera. */
      executionMs = elapsed(startedAtMs, options.clock());
    }

    const settledAtMs = options.clock();
    const settled = settleTask(current, task, outcome, settledAtMs);
    current = settled.state;
    busDrops.push(...settled.busDrops);

    executions.push({
      task,
      outcome,
      failure,
      cascaded: entry.cascaded,
      late: settled.late,
      errorMessage,
      startedAtMs,
      settledAtMs,
      queueLatencyMs:
        startedAtMs === null ? null : elapsed(task.capturedAtMs, startedAtMs),
      executionMs,
      totalLatencyMs: elapsed(task.capturedAtMs, settledAtMs),
    });

    /* L5 — pendência liberada vira nova tarefa, sempre marcada como cascata. */
    for (const next of settled.tasks) {
      cascaded += 1;
      queue.push({ task: next, cascaded: true });
    }
  }



  return {
    cameraId: current.cameraId,
    state: current,
    frameId: frame.frameId,
    decision: tick.decision,
    refusals: tick.refusals,
    busDrops,
    executions,
    admitted,
    cascaded,
    cascadeCapped,
  };
}

/* ========================================================================== */
/* Ciclo da frota                                                              */
/* ========================================================================== */

export interface FleetCycleEntry {
  readonly state: PipelineState;
  readonly frame: BusFrame;
  readonly observation: FrameObservation;
  readonly options: CycleOptions;
}

export interface FleetCycleResult {
  readonly reports: readonly CycleReport[];
  /** Estados por câmera, prontos para o próximo frame. */
  readonly states: Readonly<Record<string, PipelineState>>;
}

/**
 * Roda um ciclo por câmera. As câmeras avançam em paralelo entre si (cada uma
 * tem barramento e orçamento próprios), mas cada câmera permanece serializada
 * internamente (L4). Uma câmera que falha nunca impede as outras (L3).
 */
export async function runFleetCycle(
  entries: readonly FleetCycleEntry[],
): Promise<FleetCycleResult> {
  const reports = await Promise.all(
    entries.map((entry) =>
      runCameraCycle(entry.state, entry.frame, entry.observation, entry.options),
    ),
  );

  const states: Record<string, PipelineState> = {};
  for (const report of reports) states[report.cameraId] = report.state;

  return { reports, states };
}
