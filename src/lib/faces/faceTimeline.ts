/**
 * Onda 204 — Linha do tempo de eventos de face (paridade SIM Next, seção
 * *Busca por Faces*, áreas 5, 6 e 8).
 *
 * O manual do SIM Next descreve a busca por face terminando numa **linha do
 * tempo**: trechos coloridos marcam onde houve detecção, o operador dá zoom
 * para achar o instante e clica para saltar a reprodução. A Onda 197 entregou
 * a pergunta e a lista; faltava a régua da faixa.
 *
 * Este módulo é essa régua. Puro: sem rede, sem relógio próprio, sem I/O. Ele
 * fatia a janela pedida em baldes determinísticos e diz o que cada balde
 * significa. A tela pinta; nunca decide.
 *
 * ## O que esta régua recusa a fazer
 *
 * 1. **Não pinta balde por maioria.** Um balde com 40 leituras não
 *    identificadas e 1 suspeita de fraude é um balde com suspeita de fraude.
 *    A cor sai sempre da **pior** leitura presente ({@link BUCKET_SEVERITY}),
 *    a mesma lei do dossiê da Onda 203. Resumo por contagem esconde
 *    exatamente o evento que o operador foi procurar.
 *
 * 2. **Não confunde "não houve leitura" com "não passou ninguém".** Balde
 *    vazio é `idle` — ausência de registro, jamais ausência de pessoa. A
 *    câmera pode ter estado offline, a gravação pode não existir, a IA pode
 *    ter falhado. Afirmar vazio como prova negativa repetiria o pecado que a
 *    Onda 159 proibiu.
 *
 * 3. **Não apresenta densidade de resultado truncado como densidade real.**
 *    Se a busca foi cortada no teto de linhas, a faixa nasce
 *    {@link FaceTimeline.partial} e nenhuma leitura de "pico de movimento"
 *    pode ser feita sobre ela: o que falta foi descartado pela paginação, não
 *    pelo mundo.
 *
 * 4. **Não ancora balde no relógio local.** As bordas são múltiplos exatos do
 *    passo contados a partir do **início da janela**, nunca da meia-noite do
 *    fuso do operador. Fuso com meia hora de deslocamento (e horário de verão)
 *    faria a mesma busca produzir baldes diferentes em máquinas diferentes —
 *    e a paginação por balde passaria a repetir e engolir leituras.
 *
 * 5. **Não deixa o zoom inventar recorte.** Os passos são declarados
 *    ({@link ZOOM_STEPS_MS}) e o zoom automático escolhe o **mais grosso** que
 *    ainda cabe em {@link MAX_BUCKETS}; se nem o mais grosso couber, o
 *    resultado é recusado com motivo, não silenciosamente reamostrado.
 *
 * 6. **Não perde leitura na borda.** Balde é `[início, fim)`; a leitura exata
 *    no fim da janela pertence ao último balde, e nenhuma leitura dentro da
 *    janela fica fora de algum balde.
 */

import type { FaceSearchResult, FaceSearchVerdict } from './faceSearch';

/** Passos de zoom declarados, do mais grosso ao mais fino. */
export const ZOOM_STEPS_MS = [
  24 * 60 * 60 * 1000,
  6 * 60 * 60 * 1000,
  60 * 60 * 1000,
  15 * 60 * 1000,
  5 * 60 * 1000,
  60 * 1000,
] as const;

export type ZoomStepMs = (typeof ZOOM_STEPS_MS)[number];

/** Teto de baldes numa faixa: acima disso a faixa vira ruído ilegível. */
export const MAX_BUCKETS = 480;

/**
 * Severidade do balde. Ordem crescente de gravidade — a faixa sempre exibe o
 * maior valor presente, nunca a média nem a moda.
 */
export const BUCKET_SEVERITY = {
  idle: 0,
  unidentified: 1,
  unverified: 2,
  candidate: 3,
  identified: 4,
  spoof_suspect: 5,
} as const;

export type BucketTone = keyof typeof BUCKET_SEVERITY;

/**
 * Mapa veredito → tom do balde. `identified` fica acima de `candidate` porque
 * na faixa o que interessa é *onde olhar primeiro*: uma identificação
 * confirmada é o achado da busca. Fraude fica acima de tudo porque é o único
 * fato que desqualifica a própria leitura.
 */
const VERDICT_TONE: Record<FaceSearchVerdict, BucketTone> = {
  unidentified: 'unidentified',
  unverified: 'unverified',
  candidate: 'candidate',
  identified: 'identified',
  spoof_suspect: 'spoof_suspect',
};

export interface FaceTimelineBucket {
  readonly index: number;
  readonly startMs: number;
  /** Exclusivo, exceto no último balde, que é fechado no fim da janela. */
  readonly endMs: number;
  readonly count: number;
  readonly tone: BucketTone;
  /** Identificadores das leituras do balde, em ordem estável de resultado. */
  readonly resultIds: readonly string[];
}

export interface FaceTimeline {
  readonly fromMs: number;
  readonly toMs: number;
  readonly stepMs: number;
  readonly buckets: readonly FaceTimelineBucket[];
  /** Maior contagem observada — base honesta para a altura da barra. */
  readonly peakCount: number;
  readonly totalCount: number;
  /** Leituras dentro da janela mas fora de qualquer balde: sempre 0 por construção. */
  readonly droppedCount: number;
  /** Verdadeiro quando o resultado veio truncado: densidade não é conclusiva. */
  readonly partial: boolean;
}

export type FaceTimelineRejection =
  | 'window_invalid'
  | 'window_too_long_for_step'
  | 'step_unknown';

export type FaceTimelineOutcome =
  | { readonly ok: true; readonly timeline: FaceTimeline }
  | { readonly ok: false; readonly reason: FaceTimelineRejection };

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Escolhe o passo mais grosso que ainda respeita {@link MAX_BUCKETS}.
 * Devolve `null` quando nem o passo mais grosso cabe — recusa declarada.
 */
export function pickZoomStep(fromMs: number, toMs: number): ZoomStepMs | null {
  const span = toMs - fromMs;
  if (!isFiniteNumber(span) || span <= 0) return null;
  for (const step of ZOOM_STEPS_MS) {
    if (Math.ceil(span / step) <= MAX_BUCKETS) return step;
  }
  return null;
}

/**
 * Escolhe o passo mais fino que ainda respeita {@link MAX_BUCKETS}. Usado
 * quando o operador pede "máximo detalhe" na área de zoom.
 */
export function finestZoomStep(fromMs: number, toMs: number): ZoomStepMs | null {
  const span = toMs - fromMs;
  if (!isFiniteNumber(span) || span <= 0) return null;
  let chosen: ZoomStepMs | null = null;
  for (const step of ZOOM_STEPS_MS) {
    if (Math.ceil(span / step) <= MAX_BUCKETS) chosen = step;
  }
  return chosen;
}

/** Agrava o tom do balde. Melhora nunca acontece: a pior leitura manda. */
function worsen(current: BucketTone, next: BucketTone): BucketTone {
  return BUCKET_SEVERITY[next] > BUCKET_SEVERITY[current] ? next : current;
}

/**
 * Constrói a faixa. `stepMs` ausente aciona o zoom automático.
 *
 * Leituras fora de `[fromMs, toMs]` são ignoradas em silêncio: elas não
 * pertencem à pergunta feita, e arrastá-las para o primeiro/último balde
 * deformaria a densidade justamente nas bordas.
 */
export function buildFaceTimeline(
  results: readonly FaceSearchResult[],
  options: {
    readonly fromMs: number;
    readonly toMs: number;
    readonly stepMs?: number | null;
    readonly partial?: boolean;
  },
): FaceTimelineOutcome {
  const { fromMs, toMs } = options;

  if (!isFiniteNumber(fromMs) || !isFiniteNumber(toMs) || toMs <= fromMs) {
    return { ok: false, reason: 'window_invalid' };
  }

  let stepMs: number;
  if (options.stepMs == null) {
    const picked = pickZoomStep(fromMs, toMs);
    if (picked === null) return { ok: false, reason: 'window_too_long_for_step' };
    stepMs = picked;
  } else {
    if (!isFiniteNumber(options.stepMs) || options.stepMs <= 0) {
      return { ok: false, reason: 'step_unknown' };
    }
    if (!(ZOOM_STEPS_MS as readonly number[]).includes(options.stepMs)) {
      return { ok: false, reason: 'step_unknown' };
    }
    if (Math.ceil((toMs - fromMs) / options.stepMs) > MAX_BUCKETS) {
      return { ok: false, reason: 'window_too_long_for_step' };
    }
    stepMs = options.stepMs;
  }

  const bucketCount = Math.max(1, Math.ceil((toMs - fromMs) / stepMs));

  const counts = new Array<number>(bucketCount).fill(0);
  const tones: BucketTone[] = new Array<BucketTone>(bucketCount).fill('idle');
  const ids: string[][] = Array.from({ length: bucketCount }, () => []);

  for (const r of results) {
    if (!isFiniteNumber(r.timestampMs)) continue;
    if (r.timestampMs < fromMs || r.timestampMs > toMs) continue;
    // Borda fechada só no último balde: a leitura exata em `toMs` não pode sumir.
    const raw = Math.floor((r.timestampMs - fromMs) / stepMs);
    const index = raw >= bucketCount ? bucketCount - 1 : raw;
    counts[index] += 1;
    tones[index] = worsen(tones[index], VERDICT_TONE[r.verdict] ?? 'unverified');
    ids[index].push(r.id);
  }

  let peakCount = 0;
  let totalCount = 0;
  const buckets: FaceTimelineBucket[] = [];
  for (let i = 0; i < bucketCount; i += 1) {
    const startMs = fromMs + i * stepMs;
    const endMs = i === bucketCount - 1 ? toMs : Math.min(toMs, startMs + stepMs);
    if (counts[i] > peakCount) peakCount = counts[i];
    totalCount += counts[i];
    buckets.push({
      index: i,
      startMs,
      endMs,
      count: counts[i],
      tone: tones[i],
      resultIds: ids[i],
    });
  }

  return {
    ok: true,
    timeline: {
      fromMs,
      toMs,
      stepMs,
      buckets,
      peakCount,
      totalCount,
      droppedCount: 0,
      partial: options.partial === true,
    },
  };
}

/** Leituras de um balde, preservando a ordem determinística da busca. */
export function selectBucketResults(
  results: readonly FaceSearchResult[],
  bucket: FaceTimelineBucket,
): FaceSearchResult[] {
  const wanted = new Set(bucket.resultIds);
  return results.filter((r) => wanted.has(r.id));
}

/** Rótulo do passo de zoom, para o seletor da faixa. */
export function describeZoomStep(stepMs: number): string {
  if (stepMs >= 24 * 60 * 60 * 1000) return '1 dia';
  if (stepMs >= 60 * 60 * 1000) return `${Math.round(stepMs / (60 * 60 * 1000))} h`;
  return `${Math.round(stepMs / 60_000)} min`;
}

/** Frase de recusa — a tela nunca inventa por que a faixa não foi montada. */
export function describeTimelineRejection(reason: FaceTimelineRejection): string {
  switch (reason) {
    case 'window_invalid':
      return 'Período inválido para montar a linha do tempo.';
    case 'window_too_long_for_step':
      return `O período pedido passaria de ${MAX_BUCKETS} divisões neste zoom. Estreite a janela.`;
    default:
      return 'Zoom não reconhecido.';
  }
}

/** Passos que cabem na janela — alimenta a área de zoom sem oferecer o impossível. */
export function availableZoomSteps(fromMs: number, toMs: number): ZoomStepMs[] {
  const span = toMs - fromMs;
  if (!isFiniteNumber(span) || span <= 0) return [];
  return ZOOM_STEPS_MS.filter((step) => Math.ceil(span / step) <= MAX_BUCKETS);
}
