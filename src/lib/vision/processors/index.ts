/**
 * Onda 214 — Adaptadores reais: face, ALPR e heatmap sobre o contrato da 213.
 *
 * Até aqui o `ProcessorExecutor` do ciclo (Onda 211) era um buraco: qualquer
 * função `(task) => void`. Este módulo entrega os três processadores de
 * verdade, todos falando o mesmo envelope (`ProcessorInput` → `RawProcessorOutput`)
 * e todos submetidos às mesmas leis de fallback e isolamento.
 *
 * ## Sete leis do adaptador
 *
 * A1. **Indisponível é fracasso declarado, nunca vazio.** Modelo não carregado,
 *     WebGL perdido, frame já reciclado — tudo vira `failed` com motivo
 *     nomeado. Devolver `no_result` faria a escada de quarentena (Onda 208)
 *     acreditar que o processador está saudável enquanto a câmera está cega.
 *
 * A2. **O prazo do envelope é do adaptador também.** O adaptador aborta o
 *     backend no `deadlineMs` em vez de deixar a chamada pendurada. Um backend
 *     travado segurando o slot do barramento é a forma mais rápida de matar
 *     uma câmera (F5 da Onda 207).
 *
 * A3. **Degradação é declarada, nunca silenciosa.** Se a busca 1:N não está
 *     disponível, a face vira rastreio (detecção sem identidade) e o fato é
 *     reportado por `onDegrade`. O que não pode acontecer é sumir com a
 *     capacidade e fingir que a identificação foi feita.
 *
 * A4. **Não identificar não é identificar como desconhecido.** Similaridade
 *     abaixo do limiar produz detecção **sem** rótulo e com `identifies: false`.
 *     Carimbar "desconhecido" como identidade é fabricar leitura.
 *
 * A5. **Procedência é do backend, não do adaptador.** ANPR embarcado é
 *     `sensor`; nosso OCR é `model`; leitura de modelo generativo é
 *     `['model','llm']` — elo mais fraco vence (Onda 205), e o contrato a
 *     rebaixa para investigativa sozinho.
 *
 * A6. **Isolamento total.** Nenhuma exceção de backend sobe crua: vira `failed`
 *     com mensagem saneada, sem stack e sem eco de dados do frame.
 *
 * A7. **Determinismo de forma.** Mesmo backend, mesmo laudo: ordem preservada,
 *     ids estáveis, relógio sempre injetado. O adaptador não sorteia nada.
 */

import {
  adaptProcessor,
  DEFAULT_DEADLINES_MS,
  type OutputSink,
  type ProcessorInput,
  type ProcessorRun,
  type RawDetection,
  type RawProcessorOutput,
} from '../processorContract';
import {
  DEFAULT_PROCESSOR,
  type ProcessorCapability,
  type VisionProcessor,
} from '../visionPipeline';
import type { ProcessorExecutor } from '../pipelineCycle';
import {
  BackendUnavailableError,
  type FaceBackend,
  type FramePayload,
  type HeatBackend,
  type PlateBackend,
} from './backends';

/* ========================================================================== */
/* Infraestrutura comum                                                        */
/* ========================================================================== */

/** Resolve o frame decodificado. `null` quando já foi reciclado pelo barramento. */
export type FrameResolver = (frameId: number) => FramePayload | null | undefined;

/** Aviso de degradação — nunca silenciosa (A3). */
export type DegradeReporter = (event: {
  readonly processorId: string;
  readonly frameId: number;
  readonly from: ProcessorCapability;
  readonly to: ProcessorCapability;
  readonly reason: string;
}) => void;

/** Timer injetável para que a simulação não dependa de tempo real. */
export type TimerFn = (ms: number) => Promise<void>;

export interface AdapterDeps {
  readonly clock: () => number;
  readonly resolveFrame: FrameResolver;
  readonly onDegrade?: DegradeReporter;
  readonly timer?: TimerFn;
}

const defaultTimer: TimerFn = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, ms));
  });


/**
 * A2 — corre o backend contra o prazo do envelope e aborta no estouro.
 *
 * O `AbortSignal` é oferecido ao backend porque abortar de verdade (cancelar o
 * `fetch`, liberar o tensor) é o que devolve a GPU para a próxima tarefa;
 * apenas ignorar o resultado tardio deixaria o custo pago e o slot preso.
 */
async function withDeadline<T>(
  work: (signal: AbortSignal) => Promise<T>,
  input: ProcessorInput,
  deps: AdapterDeps,
): Promise<{ readonly timedOut: true } | { readonly timedOut: false; readonly value: T }> {
  const controller = new AbortController();
  const budget = input.deadlineMs - deps.clock();
  const timer = deps.timer ?? defaultTimer;

  /* Orçamento já vencido antes da chamada: nem chega a acordar o backend. */
  if (budget <= 0) {
    controller.abort();
    return { timedOut: true };
  }

  /* O envelope de resultado é objeto, não sentinela: um backend pode
   * legitimamente resolver com `undefined`/símbolo, e uma sentinela nua
   * confundiria "o backend devolveu isso" com "o prazo estourou". */
  const result = await Promise.race([
    work(controller.signal).then((value) => ({ timedOut: false as const, value })),
    timer(budget).then(() => ({ timedOut: true as const })),
  ]);

  if (result.timedOut) controller.abort();
  return result;
}

function sanitize(error: unknown): string {
  /* A6 — só a mensagem, nunca a stack: o texto vai para o laudo e o laudo é
   * auditável por terceiros (Onda 202). */
  if (error instanceof BackendUnavailableError) return error.message;
  if (error instanceof Error) return error.message.slice(0, 200);
  return 'backend_error';
}

function failure(
  input: ProcessorInput,
  deps: AdapterDeps,
  reason: string,
): RawProcessorOutput {
  return {
    status: 'failed',
    frameId: input.frameId,
    producedAtMs: deps.clock(),
    reason,
  };
}

/**
 * Casca comum a todos os adaptadores: resolve o frame, aplica o prazo, isola a
 * exceção e carimba o laudo. O corpo específico de cada processador só precisa
 * transformar a saída do backend em detecções.
 */
function runWithGuards(
  modelId: string,
  produce: (
    frame: FramePayload,
    signal: AbortSignal,
    input: ProcessorInput,
  ) => Promise<readonly RawDetection[]>,
  deps: AdapterDeps,
): ProcessorRun {
  return async (input) => {
    /* A1 — frame reciclado antes da execução é fracasso, não cena vazia. */
    const frame = deps.resolveFrame(input.frameId);
    if (frame === null || frame === undefined) {
      return failure(input, deps, 'frame_unavailable');
    }
    /* Defesa de sanidade: um frame de outro id jamais é aceito (espelha C3). */
    if (frame.frameId !== input.frameId) {
      return failure(input, deps, 'frame_mismatch');
    }

    let raced: Awaited<ReturnType<typeof withDeadline<readonly RawDetection[]>>>;
    try {
      raced = await withDeadline((signal) => produce(frame, signal, input), input, deps);
    } catch (error) {
      /* A6 — o erro morre aqui. */
      return failure(input, deps, sanitize(error));
    }

    if (raced.timedOut) return failure(input, deps, 'deadline_exceeded');
    const detections = raced.value;

    return {
      status: detections.length > 0 ? 'ok' : 'no_result',
      frameId: input.frameId,
      detections,
      modelId,
      producedAtMs: deps.clock(),
    };
  };
}

/* ========================================================================== */
/* Face                                                                        */
/* ========================================================================== */

export interface FaceAdapterOptions {
  /** Similaridade mínima para afirmar identidade (A4). */
  readonly matchThreshold?: number;
}

export const FACE_PROCESSOR: VisionProcessor = {
  ...DEFAULT_PROCESSOR,
  id: 'face',
  capabilities: ['track', 'identify'],
  /* Identificação facial é cara: o piso evita queimar orçamento em rajada. */
  minIntervalMs: 200,
  maxFrameAgeMs: 800,
};

export const DEFAULT_FACE_THRESHOLD = 0.62;

export function createFaceRun(
  backend: FaceBackend,
  deps: AdapterDeps,
  options: FaceAdapterOptions = {},
): ProcessorRun {
  const threshold = options.matchThreshold ?? DEFAULT_FACE_THRESHOLD;

  return runWithGuards(
    backend.modelId,
    async (frame, signal, input) => {
      const found = await backend.detect(frame, signal);
      if (found.length === 0) return [];

      const wantsIdentity = input.capability === 'identify';
      const canIdentify = typeof backend.match === 'function';

      /* A3 — degradação declarada: sem comparador, entregamos rastreio. */
      if (wantsIdentity && !canIdentify) {
        deps.onDegrade?.({
          processorId: input.processorId,
          frameId: input.frameId,
          from: 'identify',
          to: 'track',
          reason: 'match_backend_missing',
        });
      }

      const matches =
        wantsIdentity && canIdentify ? await backend.match!(found, signal) : [];
      const byDetection = new Map(matches.map((m) => [m.detectionId, m]));

      return found.map((detection): RawDetection => {
        const match = byDetection.get(detection.id);
        const identified = match !== undefined && match.similarity >= threshold;

        /* Rosto suspeito de apresentação falsa nunca identifica, por melhor que
         * seja a similaridade: é exatamente o ataque que a busca 1:N sofre. */
        const spoof = detection.spoofSuspect === true;
        const affirms = identified && !spoof && wantsIdentity && canIdentify;

        return {
          id: detection.id,
          kind: spoof ? 'face_spoof_suspect' : 'face',
          /* A4 — sem identidade afirmada, nada de rótulo inventado. */
          label: affirms ? match!.personLabel : null,
          confidence: affirms ? match!.similarity : detection.score,
          /* A5 — detector e comparador são nossos: `model`. */
          provenance: ['model'],
          box: detection.box,
          identifies: affirms,
        };
      });
    },
    deps,
  );
}

/* ========================================================================== */
/* ALPR                                                                        */
/* ========================================================================== */

export const PLATE_PROCESSOR: VisionProcessor = {
  ...DEFAULT_PROCESSOR,
  id: 'alpr',
  capabilities: ['track', 'identify'],
  minIntervalMs: 150,
  maxFrameAgeMs: 700,
};

/** A5 — a origem da leitura decide a cadeia de procedência. */
const PLATE_PROVENANCE: Readonly<Record<'device' | 'ocr' | 'llm', readonly string[]>> = {
  device: ['sensor'],
  ocr: ['model'],
  llm: ['model', 'llm'],
};

export function createPlateRun(backend: PlateBackend, deps: AdapterDeps): ProcessorRun {
  return runWithGuards(
    backend.modelId,
    async (frame, signal, input) => {
      const reads = await backend.detect(frame, signal);
      if (reads.length === 0) return [];

      const wantsIdentity = input.capability === 'identify';
      const canResolve = typeof backend.resolve === 'function';

      if (wantsIdentity && !canResolve) {
        deps.onDegrade?.({
          processorId: input.processorId,
          frameId: input.frameId,
          from: 'identify',
          to: 'track',
          reason: 'plate_list_unavailable',
        });
      }

      const resolved =
        wantsIdentity && canResolve ? await backend.resolve!(reads, signal) : [];
      const listed = new Map(resolved.map((r) => [r.id, r.listLabel]));

      return reads.map((read): RawDetection => {
        const listLabel = listed.get(read.id);
        /* Uma placa lida por LLM jamais afirma pertencimento a lista: ela é
         * pista. O contrato já a rebaixa a investigativa (C7), e aqui nós nos
         * recusamos a marcá-la como identificação (A5 + Onda 205). */
        const affirms =
          wantsIdentity && canResolve && listLabel !== undefined && read.reader !== 'llm';

        return {
          id: read.id,
          kind: 'plate',
          /* O texto da placa é o achado, mesmo sem lista: ele é a leitura. */
          label: affirms ? `${read.text} · ${listLabel}` : read.text,
          confidence: read.confidence,
          provenance: PLATE_PROVENANCE[read.reader],
          box: read.box,
          identifies: affirms,
        };
      });
    },
    deps,
  );
}

/* ========================================================================== */
/* Heatmap                                                                     */
/* ========================================================================== */

/**
 * Mapa de calor nunca identifica ninguém — é agregado por célula da grade.
 * Declarar só `track` é o que faz o contrato barrar qualquer tentativa futura
 * de anexar identidade a um dado agregado (C6), o que também é exigência de
 * proporcionalidade da LGPD.
 */
export const HEAT_PROCESSOR: VisionProcessor = {
  ...DEFAULT_PROCESSOR,
  id: 'heatmap',
  capabilities: ['track'],
  minIntervalMs: 1_000,
  maxFrameAgeMs: 5_000,
};

export function createHeatRun(backend: HeatBackend, deps: AdapterDeps): ProcessorRun {
  return runWithGuards(
    backend.modelId,
    async (frame, signal) => {
      const cells = await backend.accumulate(frame, signal);
      const columns = Math.max(1, Math.trunc(backend.columns));
      const rows = Math.max(1, Math.trunc(backend.rows));
      const cellW = 1 / columns;
      const cellH = 1 / rows;
      const total = columns * rows;

      const detections: RawDetection[] = [];
      for (const cell of cells) {
        /* Célula fora da grade declarada é descartada aqui: enviá-la ao
         * contrato viraria `invalid_box`, o que é verdade, mas o balde erraria
         * a culpa — o problema é a grade do backend, não a caixa. */
        if (!Number.isInteger(cell.index) || cell.index < 0 || cell.index >= total) {
          continue;
        }
        const col = cell.index % columns;
        const row = Math.floor(cell.index / columns);
        detections.push({
          id: `cell-${cell.index}`,
          kind: 'heat_cell',
          label: null,
          /* Intensidade é a confiança: fora de [0,1] o contrato derruba (C5) —
           * de propósito, porque calor >1 significa acumulador estourado. */
          confidence: cell.intensity,
          provenance: ['model'],
          box: { x: col * cellW, y: row * cellH, w: cellW, h: cellH },
          identifies: false,
        });
      }
      return detections;
    },
    deps,
  );
}

/* ========================================================================== */
/* Registro de executores                                                      */
/* ========================================================================== */

export interface ProcessorBackends {
  readonly face?: FaceBackend;
  readonly plate?: PlateBackend;
  readonly heat?: HeatBackend;
}

export interface RegistryOptions extends AdapterDeps {
  readonly cameraId: string;
  /** Recebe todo laudo normalizado — ponte para o livro de métricas (Onda 212). */
  readonly sink?: OutputSink;
  readonly deadlines?: Readonly<Record<ProcessorCapability, number>>;
  readonly face?: FaceAdapterOptions;
}

export interface ProcessorRegistry {
  /** Declarações para montar o `PipelineState`. */
  readonly processors: readonly VisionProcessor[];
  /** Executores prontos para `CycleOptions.executors`. */
  readonly executors: Readonly<Record<string, ProcessorExecutor>>;
}

/**
 * Monta o registro a partir dos backends disponíveis nesta câmera.
 *
 * Backend ausente **não** vira executor: o processador simplesmente não é
 * declarado. Registrar um executor que sempre falha inflaria a contagem de
 * fracassos e colocaria em quarentena um processador que nunca existiu — a
 * ausência já é reportada pelo ciclo como `executor_missing` caso alguém
 * declare o processador sem o backend (L2 da Onda 211).
 */
export function buildProcessorRegistry(
  backends: ProcessorBackends,
  options: RegistryOptions,
): ProcessorRegistry {
  const processors: VisionProcessor[] = [];
  const executors: Record<string, ProcessorExecutor> = {};
  const deps: AdapterDeps = {
    clock: options.clock,
    resolveFrame: options.resolveFrame,
    onDegrade: options.onDegrade,
    timer: options.timer,
  };
  const bridge = {
    cameraId: options.cameraId,
    clock: options.clock,
    sink: options.sink,
    deadlines: options.deadlines ?? DEFAULT_DEADLINES_MS,
  };

  if (backends.face) {
    processors.push(FACE_PROCESSOR);
    executors[FACE_PROCESSOR.id] = adaptProcessor(
      createFaceRun(backends.face, deps, options.face),
      bridge,
    );
  }
  if (backends.plate) {
    processors.push(PLATE_PROCESSOR);
    executors[PLATE_PROCESSOR.id] = adaptProcessor(
      createPlateRun(backends.plate, deps),
      bridge,
    );
  }
  if (backends.heat) {
    processors.push(HEAT_PROCESSOR);
    executors[HEAT_PROCESSOR.id] = adaptProcessor(
      createHeatRun(backends.heat, deps),
      bridge,
    );
  }

  return { processors, executors };
}
