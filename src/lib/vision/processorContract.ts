/**
 * Onda 213 — Contrato unificado de entrada e saída do `VisionProcessor`.
 *
 * ## Por que este módulo existe
 *
 * A Onda 208 padronizou a *declaração* do processador (id, capacidades,
 * quarentena) e a Onda 211 padronizou a *execução* (quem chama, quem dá baixa).
 * Mas o executor ainda tinha assinatura `(task) => void | Promise<void>`: ele
 * não recebia um envelope de entrada nem devolvia um laudo. Na prática cada
 * processador (rastreio, face, ALPR, heatmap, LLM de cena) escrevia o resultado
 * onde bem entendia, com o seu próprio formato de confiança, o seu próprio jeito
 * de dizer "não achei nada" e a sua própria noção de sucesso.
 *
 * Isso tem três consequências ruins, todas já vetadas em ondas anteriores:
 *
 *  1. "Nada encontrado" e "falhei" viram a mesma coisa — a escada de quarentena
 *     (P6/Onda 208) passa a suspender processadores saudáveis;
 *  2. um laudo de outro frame é aplicado como se fosse do frame corrente —
 *     overlay fantasma, exatamente o que a Onda 159 proíbe;
 *  3. a saída de um modelo generativo entra no sistema com a mesma força de uma
 *     medição do equipamento — o que a Onda 205 proíbe.
 *
 * Este módulo é o envelope: **uma entrada, um laudo, uma normalização**. Puro —
 * sem relógio próprio, sem rede, sem estado global. O ciclo continua sendo quem
 * executa e quem dá baixa.
 *
 * ## Dez leis do contrato
 *
 * C1. **Entrada fechada.** O processador recebe o que a admissão decidiu e nada
 *     mais: frame, capacidade, trilha e prazo. Ele nunca escolhe o próprio modo
 *     — pedir identificação quando a cadência autorizou rastreio furaria o gate
 *     de custo (Onda 206).
 *
 * C2. **Saída declarada, ou é falha.** Laudo ausente, nulo ou com estado
 *     desconhecido vira `malformed_output`. Assumir sucesso no silêncio é a
 *     forma mais barata de fabricar leitura.
 *
 * C3. **O laudo é do frame pedido.** `frameId` divergente é rejeitado como
 *     `foreign_frame` e jamais aplicado (P4 da Onda 208).
 *
 * C4. **Vazio é resposta, não fracasso.** `no_result` é execução bem-sucedida:
 *     o processador respondeu "não há nada". Contá-lo como falha suspenderia
 *     câmeras de cena parada.
 *
 * C5. **Confiança inválida não é corrigida em silêncio.** Fora de [0,1], `NaN`
 *     ou ausente derruba a detecção no balde `invalid_confidence`. Clampar para
 *     1 inventaria certeza; clampar para 0 inventaria dúvida.
 *
 * C6. **Capacidade governa o laudo.** Tarefa de `track` que devolve detecção
 *     identificada é `capability_overreach`: a detecção cai. O processador não
 *     tem direito de entregar mais do que lhe foi autorizado (P2/Onda 208).
 *
 * C7. **Procedência é do elo mais fraco.** A origem declarada por detecção é
 *     normalizada pela régua da Onda 205; ausente é `unknown`, nunca `model`.
 *     Detecção de origem `llm` ou `unknown` jamais é `confirmed` — no máximo
 *     `investigative`.
 *
 * C8. **Prazo é do envelope.** Laudo entregue depois de `deadlineMs` é
 *     `timed_out`: falha declarada, detecções descartadas como `expired`.
 *     Aplicar resultado vencido é o overlay fantasma da Onda 159.
 *
 * C9. **Contabilidade fechada.** Toda detecção recebida está aceita ou num
 *     balde de rejeição nomeado. Detecção que some sem balde é o mesmo erro
 *     probatório vetado na Onda 207 (F8).
 *
 * C10. **Normalização determinística.** Mesma entrada, mesmo laudo — ordem de
 *      detecções preservada, sem relógio interno e sem aleatoriedade.
 */

import {
  normalizeProvenanceTier,
  deriveStageTier,
  PROVENANCE_WEIGHT,
  type ProvenanceTier,
} from '@/lib/provenance/readingProvenance';
import type { ProcessorCapability, PipelineTask } from './visionPipeline';

/* ========================================================================== */
/* Entrada                                                                     */
/* ========================================================================== */

/**
 * Envelope de entrada. É construído pelo ciclo a partir da tarefa admitida —
 * nunca pelo processador (C1).
 */
export interface ProcessorInput {
  readonly cameraId: string;
  readonly processorId: string;
  /** Modo autorizado pela cadência. O processador não pode ampliá-lo (C6). */
  readonly capability: ProcessorCapability;
  readonly frameId: number;
  readonly capturedAtMs: number;
  /** Trilha alvo quando há uma; `null` em rastreio genérico. */
  readonly trackId: string | null;
  /** Instante em que o executor foi chamado. */
  readonly startedAtMs: number;
  /** Prazo absoluto para o laudo. Depois disso, o resultado é lixo (C8). */
  readonly deadlineMs: number;
}

/** Orçamento de tempo padrão por modo — identificação pode custar mais. */
export const DEFAULT_DEADLINES_MS: Readonly<Record<ProcessorCapability, number>> = {
  track: 300,
  identify: 2_500,
};

export function buildProcessorInput(
  cameraId: string,
  task: PipelineTask,
  startedAtMs: number,
  deadlines: Readonly<Record<ProcessorCapability, number>> = DEFAULT_DEADLINES_MS,
): ProcessorInput {
  return {
    cameraId,
    processorId: task.processorId,
    capability: task.kind,
    frameId: task.frameId,
    capturedAtMs: task.capturedAtMs,
    trackId: task.trackId,
    startedAtMs,
    deadlineMs: startedAtMs + deadlines[task.kind],
  };
}

/* ========================================================================== */
/* Saída bruta (o que o processador devolve)                                   */
/* ========================================================================== */

/** Grau probatório que a detecção pode reivindicar. */
export type DetectionStanding = 'confirmed' | 'probable' | 'investigative';

/**
 * Detecção como o processador a produziu. Tudo aqui é *pretensão*: nada é
 * aceito sem passar pela normalização.
 */
export interface RawDetection {
  readonly id: string;
  /** Tipo do achado, livre por processador (`face`, `plate`, `person`...). */
  readonly kind: string;
  /** Rótulo legível; `null` quando o processador só localizou, sem identificar. */
  readonly label: string | null;
  /** Confiança em [0,1]. Fora disso a detecção cai (C5). */
  readonly confidence: number;
  /** Cadeia de estágios até o resultado (Onda 205). Vazia vira `unknown`. */
  readonly provenance?: readonly string[];
  /** Caixa normalizada [0,1]; opcional — nem todo achado é espacial. */
  readonly box?: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  /** `true` quando a detecção afirma identidade (exige capacidade `identify`). */
  readonly identifies?: boolean;
}

export type RawOutputStatus = 'ok' | 'no_result' | 'failed';

export interface RawProcessorOutput {
  readonly status: RawOutputStatus;
  /** Deve casar com o frame do envelope (C3). */
  readonly frameId: number;
  readonly detections?: readonly RawDetection[];
  /** Motivo em caso de `failed`; ignorado nos demais estados. */
  readonly reason?: string;
  /** Identificação do modelo/versão, para auditoria. */
  readonly modelId?: string;
  /** Instante em que o laudo ficou pronto — árbitro do prazo (C8). */
  readonly producedAtMs: number;
}

/** A execução real, agora com contrato de ida e volta. */
export type ProcessorRun = (
  input: ProcessorInput,
) => RawProcessorOutput | Promise<RawProcessorOutput>;

/* ========================================================================== */
/* Saída normalizada (o que o sistema aceita)                                  */
/* ========================================================================== */

export type OutputVerdict = 'accepted' | 'empty' | 'rejected';

export type OutputRejection =
  /** Laudo ausente, nulo ou com estado que não existe (C2). */
  | 'malformed_output'
  /** O laudo é de outro frame (C3). */
  | 'foreign_frame'
  /** O laudo chegou depois do prazo (C8). */
  | 'timed_out'
  /** O processador declarou fracasso explicitamente. */
  | 'declared_failure';

export type DetectionRejection =
  /** Confiança ausente, `NaN` ou fora de [0,1] (C5). */
  | 'invalid_confidence'
  /** Identificação entregue por tarefa que só podia rastrear (C6). */
  | 'capability_overreach'
  /** Campos obrigatórios ausentes ou de tipo errado. */
  | 'malformed_detection'
  /** Caixa fora do quadro normalizado. */
  | 'invalid_box'
  /** Identificador repetido no mesmo laudo — a segunda cópia cai. */
  | 'duplicate_id'
  /** Laudo vencido: nada dele é aproveitado (C8). */
  | 'expired';

export const DETECTION_REJECTIONS: readonly DetectionRejection[] = [
  'invalid_confidence',
  'capability_overreach',
  'malformed_detection',
  'invalid_box',
  'duplicate_id',
  'expired',
];

export interface AcceptedDetection {
  readonly id: string;
  readonly kind: string;
  readonly label: string | null;
  readonly confidence: number;
  readonly provenance: ProvenanceTier;
  /** Grau probatório após a régua da Onda 205 (C7). */
  readonly standing: DetectionStanding;
  readonly box: RawDetection['box'] | null;
  readonly identifies: boolean;
}

export interface RejectedDetection {
  readonly id: string;
  readonly reason: DetectionRejection;
}

export interface NormalizedOutput {
  readonly verdict: OutputVerdict;
  /** `null` quando o laudo foi aceito ou estava vazio. */
  readonly rejection: OutputRejection | null;
  readonly processorId: string;
  readonly frameId: number;
  readonly capability: ProcessorCapability;
  readonly detections: readonly AcceptedDetection[];
  readonly rejectedDetections: readonly RejectedDetection[];
  /** Contadores por balde — auditoria fechada (C9). */
  readonly rejectionCounts: Readonly<Record<DetectionRejection, number>>;
  /** Quantas detecções o processador afirmou ter produzido. */
  readonly claimedDetections: number;
  readonly modelId: string | null;
  readonly reason: string | null;
  /** Duração observada, com piso zero (herança da Onda 212). */
  readonly durationMs: number;
  /**
   * `true` quando a execução deve contar como sucesso na escada de quarentena.
   * `empty` conta como sucesso (C4); rejeição, não.
   */
  readonly healthy: boolean;
}

/* ========================================================================== */
/* Normalização                                                                */
/* ========================================================================== */

function zeroCounts(): Record<DetectionRejection, number> {
  return {
    invalid_confidence: 0,
    capability_overreach: 0,
    malformed_detection: 0,
    invalid_box: 0,
    duplicate_id: 0,
    expired: 0,
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Duração jamais negativa: relógio do host pode retroceder (Onda 212, L7). */
function elapsed(fromMs: number, toMs: number): number {
  if (!isFiniteNumber(fromMs) || !isFiniteNumber(toMs)) return 0;
  return Math.max(0, toMs - fromMs);
}

/**
 * C7 — grau probatório derivado da procedência e da confiança.
 *
 * A régua da Onda 205 é lei aqui: confiança **nunca promove origem**. Um LLM
 * com 0,99 continua sendo pista de investigação; um `unknown` não vira prova
 * porque o número ficou bonito.
 */
function standingOf(tier: ProvenanceTier, confidence: number): DetectionStanding {
  if (PROVENANCE_WEIGHT[tier] <= PROVENANCE_WEIGHT.llm) return 'investigative';
  if (tier === 'human') return 'confirmed';
  if (tier === 'sensor') return confidence >= 0.9 ? 'confirmed' : 'probable';
  /* `model`: determinístico e reprodutível, mas ainda estatístico — nunca
   * `confirmed` sozinho. A confirmação exige corroboração de fonte distinta,
   * que é decisão de outro módulo (Onda 205), não deste envelope. */
  return confidence >= 0.75 ? 'probable' : 'investigative';
}

function boxIsValid(box: RawDetection['box']): boolean {
  if (box === undefined) return true;
  const values = [box.x, box.y, box.w, box.h];
  if (!values.every(isFiniteNumber)) return false;
  if (box.w <= 0 || box.h <= 0) return false;
  return (
    box.x >= 0 && box.y >= 0 && box.x + box.w <= 1.000001 && box.y + box.h <= 1.000001
  );
}

/**
 * Normaliza uma detecção crua. Devolve a detecção aceita **ou** o motivo da
 * rejeição — nunca as duas coisas, nunca nenhuma (C9).
 */
function normalizeDetection(
  raw: unknown,
  capability: ProcessorCapability,
  seen: Set<string>,
): { accepted: AcceptedDetection } | { rejected: RejectedDetection } {
  if (typeof raw !== 'object' || raw === null) {
    return { rejected: { id: '(sem id)', reason: 'malformed_detection' } };
  }

  const candidate = raw as Partial<RawDetection>;
  const id = isNonEmptyString(candidate.id) ? candidate.id : null;
  if (id === null || !isNonEmptyString(candidate.kind)) {
    return { rejected: { id: id ?? '(sem id)', reason: 'malformed_detection' } };
  }

  /* C9 — id repetido: a segunda cópia cai num balde, não é mesclada. Mesclar
   * silenciosamente esconderia um processador que duplica achados. */
  if (seen.has(id)) return { rejected: { id, reason: 'duplicate_id' } };

  /* C5 — confiança inválida derruba a detecção; clampar inventaria certeza. */
  const confidence = candidate.confidence;
  if (!isFiniteNumber(confidence) || confidence < 0 || confidence > 1) {
    return { rejected: { id, reason: 'invalid_confidence' } };
  }

  const identifies = candidate.identifies === true;
  /* C6 — quem foi autorizado a rastrear não tem direito de identificar. */
  if (identifies && capability !== 'identify') {
    return { rejected: { id, reason: 'capability_overreach' } };
  }

  if (!boxIsValid(candidate.box)) return { rejected: { id, reason: 'invalid_box' } };

  /* C7 — cadeia de estágios: o elo mais fraco governa; vazia é `unknown`. */
  const stages = Array.isArray(candidate.provenance) ? candidate.provenance : [];
  const tier: ProvenanceTier =
    stages.length === 0 ? 'unknown' : deriveStageTier(stages.map(normalizeProvenanceTier));

  seen.add(id);
  return {
    accepted: {
      id,
      kind: candidate.kind,
      label: isNonEmptyString(candidate.label) ? candidate.label : null,
      confidence,
      provenance: tier,
      standing: standingOf(tier, confidence),
      box: candidate.box ?? null,
      identifies,
    },
  };
}

/**
 * Converte um laudo cru em laudo aceito pelo sistema. Nunca lança: entrada
 * hostil vira veredito `rejected` com motivo nomeado (C2).
 */
export function normalizeProcessorOutput(
  input: ProcessorInput,
  raw: unknown,
): NormalizedOutput {
  const base = {
    processorId: input.processorId,
    frameId: input.frameId,
    capability: input.capability,
    detections: [] as readonly AcceptedDetection[],
    rejectedDetections: [] as readonly RejectedDetection[],
    rejectionCounts: zeroCounts() as Readonly<Record<DetectionRejection, number>>,
    claimedDetections: 0,
    modelId: null as string | null,
    reason: null as string | null,
    durationMs: 0,
    healthy: false,
  };

  /* C2 — laudo que não é objeto não é laudo. */
  if (typeof raw !== 'object' || raw === null) {
    return { ...base, verdict: 'rejected', rejection: 'malformed_output' };
  }

  const output = raw as Partial<RawProcessorOutput>;
  const claimed = Array.isArray(output.detections) ? output.detections.length : 0;
  const modelId = isNonEmptyString(output.modelId) ? output.modelId : null;
  const producedAtMs = isFiniteNumber(output.producedAtMs) ? output.producedAtMs : null;
  const durationMs = producedAtMs === null ? 0 : elapsed(input.startedAtMs, producedAtMs);

  const withMeta = { ...base, claimedDetections: claimed, modelId, durationMs };

  /* C2 — estado desconhecido, ausente ou carimbo de tempo inválido. */
  if (
    output.status !== 'ok' &&
    output.status !== 'no_result' &&
    output.status !== 'failed'
  ) {
    return { ...withMeta, verdict: 'rejected', rejection: 'malformed_output' };
  }
  if (producedAtMs === null) {
    return { ...withMeta, verdict: 'rejected', rejection: 'malformed_output' };
  }

  /* C3 — laudo de outro frame nunca é aplicado, mesmo estando perfeito. */
  if (output.frameId !== input.frameId) {
    return { ...withMeta, verdict: 'rejected', rejection: 'foreign_frame' };
  }

  /* C8 — vencido: descartamos tudo, mas contabilizamos cada detecção perdida. */
  if (producedAtMs > input.deadlineMs) {
    const counts = zeroCounts();
    counts.expired = claimed;
    const rejectedDetections: RejectedDetection[] = [];
    for (let i = 0; i < claimed; i += 1) {
      const detection = (output.detections as readonly RawDetection[])[i];
      rejectedDetections.push({
        id: isNonEmptyString(detection?.id) ? detection.id : `#${i}`,
        reason: 'expired',
      });
    }
    return {
      ...withMeta,
      verdict: 'rejected',
      rejection: 'timed_out',
      rejectedDetections,
      rejectionCounts: counts,
      reason: isNonEmptyString(output.reason) ? output.reason : null,
    };
  }

  if (output.status === 'failed') {
    return {
      ...withMeta,
      verdict: 'rejected',
      rejection: 'declared_failure',
      reason: isNonEmptyString(output.reason) ? output.reason : null,
    };
  }

  const accepted: AcceptedDetection[] = [];
  const rejected: RejectedDetection[] = [];
  const counts = zeroCounts();
  const seen = new Set<string>();

  /* C10 — ordem preservada: o laudo é lido do começo ao fim, sem reordenação. */
  for (const candidate of (output.detections ?? []) as readonly unknown[]) {
    const result = normalizeDetection(candidate, input.capability, seen);
    if ('accepted' in result) accepted.push(result.accepted);
    else {
      rejected.push(result.rejected);
      counts[result.rejected.reason] += 1;
    }
  }

  /* C4 — "não achei nada" é resposta legítima e execução saudável. Note que um
   * laudo `ok` cujas detecções foram todas rejeitadas também termina vazio:
   * ainda assim o processador respondeu, e a rejeição já está contabilizada. */
  const verdict: OutputVerdict = accepted.length > 0 ? 'accepted' : 'empty';

  return {
    ...withMeta,
    verdict,
    rejection: null,
    detections: accepted,
    rejectedDetections: rejected,
    rejectionCounts: counts,
    reason: null,
    healthy: true,
  };
}

/* ========================================================================== */
/* Ponte com o ciclo (Onda 211)                                                */
/* ========================================================================== */

/** Recebe cada laudo normalizado. Nunca deve lançar. */
export type OutputSink = (output: NormalizedOutput) => void;

export interface AdapterOptions {
  readonly cameraId: string;
  readonly clock: () => number;
  readonly sink?: OutputSink;
  readonly deadlines?: Readonly<Record<ProcessorCapability, number>>;
}

/** Erro que sinaliza fracasso de contrato ao ciclo, preservando o motivo. */
export class ProcessorContractError extends Error {
  constructor(
    readonly rejection: OutputRejection,
    readonly output: NormalizedOutput,
  ) {
    super(`contract_${rejection}`);
    this.name = 'ProcessorContractError';
  }
}

/**
 * Embrulha um `ProcessorRun` no executor que o ciclo da Onda 211 espera.
 *
 * A ponte é fina de propósito: ela **não** decide saúde por conta própria —
 * apenas traduz "laudo rejeitado" em exceção, que é a linguagem que o ciclo já
 * entende (`executor_threw` → escada de quarentena da Onda 208). Laudo vazio
 * não lança: o processador respondeu (C4).
 */
export function adaptProcessor(run: ProcessorRun, options: AdapterOptions) {
  return async (task: PipelineTask): Promise<void> => {
    const startedAtMs = options.clock();
    const input = buildProcessorInput(
      options.cameraId,
      task,
      startedAtMs,
      options.deadlines ?? DEFAULT_DEADLINES_MS,
    );

    let raw: unknown;
    try {
      raw = await run(input);
    } catch (error) {
      /* Exceção do processador é fracasso declarado — mas ainda passa pelo
       * envelope, para que o sink receba um laudo com balde nomeado (C9). */
      const output = normalizeProcessorOutput(input, {
        status: 'failed',
        frameId: input.frameId,
        producedAtMs: options.clock(),
        reason: error instanceof Error ? error.message : 'unknown_error',
      });
      options.sink?.(output);
      throw new ProcessorContractError('declared_failure', output);
    }

    const output = normalizeProcessorOutput(input, raw);
    options.sink?.(output);
    if (output.rejection !== null) {
      throw new ProcessorContractError(output.rejection, output);
    }
  };
}

/* ========================================================================== */
/* Auditoria                                                                   */
/* ========================================================================== */

/**
 * Autoteste do laudo: devolve as violações encontradas. Lista vazia é o
 * esperado — usada na simulação e nos testes para provar C9.
 */
export function auditOutput(output: NormalizedOutput): readonly string[] {
  const problems: string[] = [];

  const bucketSum = DETECTION_REJECTIONS.reduce(
    (acc, bucket) => acc + output.rejectionCounts[bucket],
    0,
  );
  if (bucketSum !== output.rejectedDetections.length) {
    problems.push('C9: baldes de rejeição não somam as detecções rejeitadas');
  }
  if (output.verdict !== 'rejected' && output.detections.length + bucketSum !== output.claimedDetections) {
    problems.push('C9: detecções aceitas + rejeitadas ≠ detecções afirmadas');
  }
  if (output.rejection !== null && output.verdict !== 'rejected') {
    problems.push('C2: laudo com motivo de rejeição precisa ter veredito rejeitado');
  }
  if (output.rejection === null && output.verdict === 'rejected') {
    problems.push('C2: rejeição sem motivo nomeado');
  }
  if (output.healthy && output.verdict === 'rejected') {
    problems.push('C4: laudo rejeitado jamais conta como execução saudável');
  }
  if (output.durationMs < 0) problems.push('duração negativa');

  for (const detection of output.detections) {
    if (detection.confidence < 0 || detection.confidence > 1) {
      problems.push(`C5: confiança fora da faixa em ${detection.id}`);
    }
    /* C7 — a lei mais importante do envelope: origem fraca nunca afirma. */
    if (
      detection.standing === 'confirmed' &&
      PROVENANCE_WEIGHT[detection.provenance] <= PROVENANCE_WEIGHT.model
    ) {
      problems.push(`C7: ${detection.id} afirma com procedência insuficiente`);
    }
    if (detection.identifies && output.capability !== 'identify') {
      problems.push(`C6: ${detection.id} identifica sem autorização`);
    }
  }

  return problems;
}
