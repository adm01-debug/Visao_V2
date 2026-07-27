/**
 * Onda 158 — REGRA ÚNICA DE ADMISSÃO DO PEDIDO DE SELAGEM.
 *
 * A Onda 156 definiu *como se avalia* uma peça probatória e a 157 definiu *como
 * ela é gravada de forma imutável*. Faltava a porta: **quem monta o manifesto**.
 *
 * Enquanto o manifesto for montado no navegador, o selo prova apenas que o
 * cliente é coerente consigo mesmo. Um operador mal-intencionado (ou um script
 * apontado para a API) declara `requestedBy` de outra pessoa, antedata
 * `generatedAtUtc`, inventa um `exportId` e o banco carimba tudo — porque o
 * banco confere a *corrente*, não a *procedência*. Esta onda tira do cliente
 * exatamente os campos que ele não tem direito de afirmar.
 *
 * ## Decisões e o porquê
 *
 *  A1 — **Identidade, autoria e relógio são do servidor.** `exportId`,
 *  `requestedBy`, `generatedAtUtc` e `systemVersion` nunca vêm do corpo. E se
 *  vierem, o pedido é **recusado**, não higienizado em silêncio: quem tenta
 *  escrever a autoria de uma prova precisa ouvir "não", e a tentativa precisa
 *  aparecer. Ignorar calado transforma ataque em ruído.
 *
 *  A2 — **Validação estrutural aqui; julgamento probatório lá.** Esta função
 *  recusa o que não é *um pedido* (tipo errado, campo faltando, tamanho
 *  absurdo). Ela NÃO recusa o que é um pedido ruim (hash vazio, lacuna,
 *  sobreposição, desvio de relógio): isso é competência de `assessCustody`, que
 *  registra o defeito no manifesto e rebaixa o veredito. Se a borda filtrasse
 *  material fraco, o defeito sumiria do documento — e prova fraca declarada vale
 *  mais que prova fraca escondida.
 *
 *  A3 — **`pixelsAltered` é declaração consciente, não default.** Ausente =
 *  recusa. Assumir `false` faz o sistema afirmar, no lugar do operador, que os
 *  bytes são originais — exatamente a mentira que o confronto com
 *  `transformations` (C4 da Onda 156) existe para pegar.
 *
 *  A4 — **Janela pedida é fato do requerente e precisa ser sã.** Início antes do
 *  fim, ISO parseável, no máximo 24h. O teto não é burocracia: um pedido de
 *  10 anos gera um manifesto com `coverageRatio` ~0 que só serve para
 *  constranger a peça em audiência, e ainda varre a tabela de mídia inteira.
 *
 *  A5 — **Limites explícitos.** 500 segmentos e 20 transformações. Sem teto, um
 *  único POST encadeia 10⁶ hashes na borda e derruba a função para todo mundo —
 *  negação de serviço num caminho que precisa estar disponível justamente
 *  quando algo grave aconteceu.
 *
 * Módulo puro: sem rede, sem relógio próprio (o instante é injetado), sem I/O.
 */

import type {
  EvidenceSegment,
  EvidenceTransformation,
  ExportRequest,
  TransformationKind,
} from './custodyManifest.ts';

/** Teto de segmentos por exportação (A5). */
export const MAX_SEGMENTS = 500;

/** Teto de transformações declaradas (A5). */
export const MAX_TRANSFORMATIONS = 20;

/** Teto da janela pedida (A4). */
export const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Tolerância para pedido "no futuro" — relógio do cliente adiantado. */
export const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

/** Campos que o cliente jamais pode enviar (A1). */
export const SERVER_OWNED_FIELDS = [
  'export_id',
  'exportId',
  'requested_by',
  'requestedBy',
  'generated_at_utc',
  'generatedAtUtc',
  'system_version',
  'systemVersion',
  'root_hash',
  'rootHash',
  'chain',
  'assessment',
  'verdict',
] as const;

const TRANSFORMATION_KINDS: readonly TransformationKind[] = [
  'watermark',
  'transcode',
  'redaction',
  'trim',
  'concat',
];

export type SealRejectionCode =
  | 'malformed_body'
  | 'client_supplied_server_field'
  | 'invalid_camera_id'
  | 'invalid_window'
  | 'window_too_long'
  | 'window_in_future'
  | 'empty_segments'
  | 'too_many_segments'
  | 'invalid_segment'
  | 'too_many_transformations'
  | 'invalid_transformation'
  | 'missing_pixels_altered';

export interface SealContext {
  /** Autor autenticado — vem do JWT, nunca do corpo. */
  readonly requestedBy: string;
  /** Identificador da exportação, gerado no servidor. */
  readonly exportId: string;
  /** Relógio do servidor em ms. */
  readonly nowMs: number;
  readonly systemVersion: string;
}

export type SealAdmission =
  | { readonly ok: true; readonly request: ExportRequest }
  | { readonly ok: false; readonly code: SealRejectionCode; readonly detail: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isFiniteInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && Number.isInteger(v);
}

function isNonEmptyString(v: unknown, max: number): v is string {
  return typeof v === 'string' && v.trim() !== '' && v.length <= max;
}

function parseIso(v: unknown): number | null {
  if (typeof v !== 'string' || v.trim() === '') return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
}

function reject(code: SealRejectionCode, detail: string): SealAdmission {
  return { ok: false, code, detail };
}

/**
 * Converte um corpo cru de requisição num `ExportRequest` confiável, ou recusa.
 * Nunca lança: entrada hostil é resultado esperado, não exceção.
 */
export function admitSealRequest(body: unknown, ctx: SealContext): SealAdmission {
  if (!isPlainObject(body)) {
    return reject('malformed_body', 'Corpo da requisição não é um objeto JSON.');
  }

  // A1 — tentativa de escrever campo do servidor é recusa barulhenta.
  for (const field of SERVER_OWNED_FIELDS) {
    if (field in body) {
      return reject(
        'client_supplied_server_field',
        `O campo "${field}" é determinado pelo servidor e não pode ser enviado.`,
      );
    }
  }

  const cameraId = body.camera_id;
  if (typeof cameraId !== 'string' || !UUID_RE.test(cameraId)) {
    return reject('invalid_camera_id', 'camera_id deve ser um UUID.');
  }

  const fromUtc = body.requested_from_utc;
  const toUtc = body.requested_to_utc;
  const fromMs = parseIso(fromUtc);
  const toMs = parseIso(toUtc);
  if (fromMs === null || toMs === null) {
    return reject('invalid_window', 'requested_from_utc/requested_to_utc devem ser ISO 8601 válidos.');
  }
  if (fromMs >= toMs) {
    return reject('invalid_window', 'O início da janela deve ser anterior ao fim.');
  }
  if (toMs - fromMs > MAX_WINDOW_MS) {
    return reject('window_too_long', `A janela pedida excede ${MAX_WINDOW_MS} ms.`);
  }
  if (fromMs > ctx.nowMs + FUTURE_TOLERANCE_MS) {
    return reject('window_in_future', 'A janela pedida começa no futuro.');
  }

  if (typeof body.pixels_altered !== 'boolean') {
    // A3 — sem default. O operador precisa afirmar.
    return reject(
      'missing_pixels_altered',
      'pixels_altered é obrigatório e booleano: declare se os bytes diferem do original.',
    );
  }

  const rawSegments = body.segments;
  if (!Array.isArray(rawSegments) || rawSegments.length === 0) {
    return reject('empty_segments', 'segments deve ser uma lista com ao menos um trecho.');
  }
  if (rawSegments.length > MAX_SEGMENTS) {
    return reject('too_many_segments', `Máximo de ${MAX_SEGMENTS} segmentos por exportação.`);
  }

  const segments: EvidenceSegment[] = [];
  for (let i = 0; i < rawSegments.length; i += 1) {
    const raw = rawSegments[i];
    if (!isPlainObject(raw)) {
      return reject('invalid_segment', `Segmento ${i} não é um objeto.`);
    }
    if (!isFiniteInt(raw.index) || (raw.index as number) < 0) {
      return reject('invalid_segment', `Segmento ${i}: index deve ser inteiro ≥ 0.`);
    }
    if (!isNonEmptyString(raw.storage_path, 512)) {
      return reject('invalid_segment', `Segmento ${i}: storage_path ausente ou grande demais.`);
    }
    if (!isFiniteInt(raw.byte_size) || (raw.byte_size as number) < 0) {
      return reject('invalid_segment', `Segmento ${i}: byte_size deve ser inteiro ≥ 0.`);
    }
    // A2 — hash vazio ou fora de formato NÃO é recusado aqui: é rebaixamento
    // documentado pelo assessCustody. Só o tipo é exigido.
    if (typeof raw.sha256 !== 'string' || raw.sha256.length > 128) {
      return reject('invalid_segment', `Segmento ${i}: sha256 deve ser texto.`);
    }
    for (const key of ['device_start_utc', 'device_end_utc', 'received_at_utc'] as const) {
      if (typeof raw[key] !== 'string' || (raw[key] as string).length > 64) {
        return reject('invalid_segment', `Segmento ${i}: ${key} deve ser texto ISO.`);
      }
    }
    if (!isFiniteInt(raw.clock_offset_ms)) {
      return reject('invalid_segment', `Segmento ${i}: clock_offset_ms deve ser inteiro.`);
    }

    segments.push({
      index: raw.index as number,
      storagePath: raw.storage_path as string,
      byteSize: raw.byte_size as number,
      sha256: raw.sha256 as string,
      deviceStartUtc: raw.device_start_utc as string,
      deviceEndUtc: raw.device_end_utc as string,
      receivedAtUtc: raw.received_at_utc as string,
      clockOffsetMs: raw.clock_offset_ms as number,
    });
  }

  const rawTransformations = body.transformations ?? [];
  if (!Array.isArray(rawTransformations)) {
    return reject('invalid_transformation', 'transformations deve ser uma lista.');
  }
  if (rawTransformations.length > MAX_TRANSFORMATIONS) {
    return reject(
      'too_many_transformations',
      `Máximo de ${MAX_TRANSFORMATIONS} transformações declaradas.`,
    );
  }

  const transformations: EvidenceTransformation[] = [];
  for (let i = 0; i < rawTransformations.length; i += 1) {
    const raw = rawTransformations[i];
    if (!isPlainObject(raw)) {
      return reject('invalid_transformation', `Transformação ${i} não é um objeto.`);
    }
    if (
      typeof raw.kind !== 'string' ||
      !TRANSFORMATION_KINDS.includes(raw.kind as TransformationKind)
    ) {
      return reject('invalid_transformation', `Transformação ${i}: kind desconhecido.`);
    }
    if (!isNonEmptyString(raw.detail, 300)) {
      return reject('invalid_transformation', `Transformação ${i}: detail obrigatório.`);
    }
    if (!isNonEmptyString(raw.tool, 300)) {
      return reject('invalid_transformation', `Transformação ${i}: tool obrigatório.`);
    }
    transformations.push({
      kind: raw.kind as TransformationKind,
      detail: raw.detail as string,
      tool: raw.tool as string,
    });
  }

  return {
    ok: true,
    request: {
      exportId: ctx.exportId,
      cameraId,
      requestedBy: ctx.requestedBy,
      requestedFromUtc: new Date(fromMs).toISOString(),
      requestedToUtc: new Date(toMs).toISOString(),
      segments,
      transformations,
      pixelsAltered: body.pixels_altered,
      generatedAtUtc: new Date(ctx.nowMs).toISOString(),
      systemVersion: ctx.systemVersion,
    },
  };
}

/** Status HTTP correspondente a cada recusa — recusa por conteúdo é 400/422. */
export function statusForRejection(code: SealRejectionCode): number {
  return code === 'client_supplied_server_field' ? 422 : 400;
}
