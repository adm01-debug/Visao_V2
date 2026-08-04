/**
 * Onda 214 — Backends dos processadores reais (face / ALPR / heatmap).
 *
 * Este arquivo define **apenas as portas**: o que o adaptador espera de um
 * detector, de um comparador de identidade, de um OCR de placa e de um
 * acumulador de calor. A implementação concreta (TensorFlow.js no navegador,
 * ANPR embarcado da câmera, edge function com Gemini) é injetada.
 *
 * A separação não é purismo: sem ela, nenhuma das leis do contrato pode ser
 * provada por força bruta, porque toda simulação dependeria de GPU e rede. Com
 * ela, o mesmo adaptador que roda em produção roda na simulação com backends
 * hostis (lento, mudo, mentiroso, explodindo).
 */

/* ========================================================================== */
/* Erros de backend                                                            */
/* ========================================================================== */

/**
 * Backend declaradamente indisponível: modelo não carregado, WebGL perdido,
 * câmera sem ANPR embarcado.
 *
 * É uma classe própria porque "não estou disponível" é diferente de "tentei e
 * errei": a primeira não deve ser lida como incompetência do modelo, embora
 * ambas contem como fracasso na escada de quarentena (Onda 208).
 */
export class BackendUnavailableError extends Error {
  constructor(
    readonly backendId: string,
    reason: string
  ) {
    super(`${backendId}_unavailable: ${reason}`);
    this.name = 'BackendUnavailableError';
  }
}

/* ========================================================================== */
/* Portas                                                                      */
/* ========================================================================== */

/** Referência ao frame já decodificado pelo FrameBus (Onda 207). */
export interface FramePayload {
  readonly frameId: number;
  /** Bitmap/tensor opaco. O adaptador nunca inspeciona o conteúdo. */
  readonly image: unknown;
  readonly width: number;
  readonly height: number;
}

/** Caixa normalizada em [0,1] relativa ao quadro. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface FaceDetection {
  readonly id: string;
  readonly box: Box;
  readonly score: number;
  /** Vetor de características, quando o detector já o produz. */
  readonly embedding?: readonly number[];
  /** `true` quando o detector suspeita de apresentação falsa (foto/tela). */
  readonly spoofSuspect?: boolean;
}

export interface FaceMatch {
  readonly detectionId: string;
  readonly personId: string;
  readonly personLabel: string;
  /** Similaridade em [0,1]. */
  readonly similarity: number;
}

export interface FaceBackend {
  readonly modelId: string;
  /** Localiza rostos. Barato — roda em cadência de rastreio. */
  detect(frame: FramePayload, signal: AbortSignal): Promise<readonly FaceDetection[]>;
  /**
   * Compara contra a watchlist. Caro — só roda em cadência de identificação.
   * Ausente significa que a busca 1:N não está disponível nesta câmera; o
   * adaptador degrada para rastreio em vez de falhar (A3).
   */
  match?(detections: readonly FaceDetection[], signal: AbortSignal): Promise<readonly FaceMatch[]>;
}

export interface PlateRead {
  readonly id: string;
  readonly box: Box;
  readonly text: string;
  readonly confidence: number;
  /**
   * Quem leu a placa:
   * - `device`: ANPR embarcado da câmera (medição do equipamento → `sensor`);
   * - `ocr`: nosso OCR determinístico (→ `model`);
   * - `llm`: modelo generativo descreveu a placa (→ `['model','llm']`).
   */
  readonly reader: 'device' | 'ocr' | 'llm';
}

export interface PlateBackend {
  readonly modelId: string;
  detect(frame: FramePayload, signal: AbortSignal): Promise<readonly PlateRead[]>;
  /** Confirma a leitura contra a lista de interesse. Opcional. */
  resolve?(
    reads: readonly PlateRead[],
    signal: AbortSignal
  ): Promise<readonly { readonly id: string; readonly listLabel: string }[]>;
}

export interface HeatCell {
  /** Índice da célula na grade declarada. */
  readonly index: number;
  /** Intensidade normalizada em [0,1]. */
  readonly intensity: number;
}

export interface HeatBackend {
  readonly modelId: string;
  /** Colunas da grade — usado para reconstituir a caixa da célula. */
  readonly columns: number;
  readonly rows: number;
  accumulate(frame: FramePayload, signal: AbortSignal): Promise<readonly HeatCell[]>;
}
