/**
 * Onda 156 — REGRA ÚNICA DA EXPORTAÇÃO PROBATÓRIA (CADEIA DE CUSTÓDIA).
 *
 * ## O que está em jogo
 *
 * As ondas anteriores respondem "o sistema está saudável?". Esta responde
 * "**este vídeo pode ser usado como prova?**" — em sindicância trabalhista,
 * boletim de ocorrência ou processo judicial. O erro aqui não gera um número
 * torto num painel: gera uma peça que a parte contrária derruba em audiência,
 * ou — infinitamente pior — uma peça **falsa** que o nosso próprio sistema
 * carimbou como íntegra.
 *
 * Por isso o módulo é puro: sem React, sem rede, sem relógio próprio (o instante
 * é injetado), sem I/O. A única dependência externa é a função de hash, também
 * injetável, para que todo veredito seja reproduzível byte a byte no CI, na
 * borda e no banco.
 *
 * ## Decisões e o porquê
 *
 *  C1 — **Lacuna é fato, não defeito.** Câmera cai, disco enche, rede some. Uma
 *  exportação com buraco na linha do tempo continua admissível — o que a
 *  destrói é *esconder* o buraco. Costurar dois trechos não contíguos num
 *  arquivo só, sem declarar, fabrica continuidade que nunca existiu. Lacuna
 *  declarada rebaixa para `weakened`; lacuna não declarável não existe aqui,
 *  porque o manifesto sempre a enumera.
 *
 *  C2 — **Nada é corrigido em silêncio.** Se o relógio da câmera está 40s
 *  adiantado, o manifesto registra o desvio e rebaixa o valor probatório. Ele
 *  NÃO reescreve os carimbos para "arrumar" a linha do tempo: carimbo corrigido
 *  por software é carimbo adulterado, e a defesa técnica correta ("o relógio do
 *  equipamento estava assim") vira mentira ("o sistema alterou o horário").
 *
 *  C3 — **O elo aponta para trás.** Cada segmento é encadeado ao hash do
 *  anterior. Trocar o segmento 3 quebra 3, 4, 5... — por isso a verificação
 *  reporta o **primeiro** índice divergente. Reportar todos trata consequência
 *  como causa e manda o perito investigar cinco lugares em vez de um.
 *
 *  C4 — **Transformação que toca pixel precisa estar declarada.** Marca d'água,
 *  reencode, tarja em rosto: tudo altera os bytes originais. Alterar sem
 *  declarar é `broken`, não `weakened` — é a diferença entre uma cópia tratada
 *  e uma falsificação.
 *
 *  C5 — **Segmento sem hash não entra.** Um único trecho sem impressão digital
 *  contamina a peça inteira: não há como provar que aquele pedaço não foi
 *  trocado. Preferimos recusar a exportação a emitir um selo que não sustenta.
 *
 *  C6 — **Exportação sem autor não é prova.** Cadeia de custódia começa em
 *  "quem pediu, quando". Anônimo é `broken`.
 *
 *  C7 — **Canonicalização determinística ou nada.** Se o mesmo conteúdo puder
 *  serializar de dois jeitos, o mesmo vídeo produz dois hashes e toda a
 *  estrutura se autoinvalida. Chaves ordenadas, números finitos, sem
 *  `undefined`, timestamps normalizados em UTC com milissegundos.
 */

/* ========================================================================== */
/*  Tipos                                                                     */
/* ========================================================================== */

/** Função de hash injetável: recebe bytes, devolve hexadecimal minúsculo. */
export type HashFn = (bytes: Uint8Array) => Promise<string>;

export interface EvidenceSegment {
  /** Posição declarada pelo produtor; validada contra a ordem real. */
  readonly index: number;
  /** Caminho imutável no armazenamento (não é URL assinada — essa expira). */
  readonly storagePath: string;
  readonly byteSize: number;
  /** SHA-256 do arquivo original, minúsculo, 64 hex. Vazio = sem prova. */
  readonly sha256: string;
  /** Carimbo do equipamento, exatamente como ele reportou. */
  readonly deviceStartUtc: string;
  readonly deviceEndUtc: string;
  /** Instante em que o servidor recebeu o trecho (relógio confiável). */
  readonly receivedAtUtc: string;
  /**
   * Desvio observado do relógio da câmera em relação ao servidor, em ms.
   * Positivo = câmera adiantada. Registrado, nunca aplicado.
   */
  readonly clockOffsetMs: number;
}

export type TransformationKind =
  | 'watermark'
  | 'transcode'
  | 'redaction'
  | 'trim'
  | 'concat';

export interface EvidenceTransformation {
  readonly kind: TransformationKind;
  /** Descrição humana e verificável do que foi feito. */
  readonly detail: string;
  /** Ferramenta/versão responsável — o perito precisa poder reproduzir. */
  readonly tool: string;
}

export interface ExportRequest {
  readonly exportId: string;
  readonly cameraId: string;
  /** Quem pediu. Vazio invalida a cadeia (C6). */
  readonly requestedBy: string;
  readonly requestedFromUtc: string;
  readonly requestedToUtc: string;
  readonly segments: readonly EvidenceSegment[];
  readonly transformations: readonly EvidenceTransformation[];
  /**
   * O produtor declara se os bytes entregues diferem dos originais. Serve de
   * confronto contra `transformations` (C4).
   */
  readonly pixelsAltered: boolean;
  readonly generatedAtUtc: string;
  readonly systemVersion: string;
}

export type CustodyVerdictLevel = 'admissible' | 'weakened' | 'broken';

export type CustodyReasonCode =
  | 'empty_export'
  | 'unattributed_export'
  | 'unhashed_segment'
  | 'invalid_hash_format'
  | 'invalid_timestamp'
  | 'inverted_segment'
  | 'undeclared_transformation'
  | 'declared_without_alteration'
  | 'zero_byte_segment'
  | 'timeline_gap'
  | 'timeline_overlap'
  | 'non_monotonic_order'
  | 'clock_skew'
  | 'partial_coverage'
  | 'duplicate_segment';

export interface CustodyReason {
  readonly code: CustodyReasonCode;
  /** Índice do segmento culpado, quando aplicável. */
  readonly segmentIndex: number | null;
  readonly detail: string;
}

export interface TimelineGap {
  readonly afterIndex: number;
  readonly gapMs: number;
}

export interface CustodyAssessment {
  readonly level: CustodyVerdictLevel;
  readonly reasons: readonly CustodyReason[];
  readonly gaps: readonly TimelineGap[];
  /** Soma da duração coberta pelos segmentos, sem contar sobreposição. */
  readonly coveredMs: number;
  readonly requestedMs: number;
  /** 0..1 — fração do intervalo pedido efetivamente coberta. */
  readonly coverageRatio: number;
}

export interface CustodyManifest {
  readonly version: 1;
  readonly exportId: string;
  readonly cameraId: string;
  readonly requestedBy: string;
  readonly requestedFromUtc: string;
  readonly requestedToUtc: string;
  readonly generatedAtUtc: string;
  readonly systemVersion: string;
  readonly pixelsAltered: boolean;
  readonly segments: readonly EvidenceSegment[];
  readonly transformations: readonly EvidenceTransformation[];
  readonly assessment: CustodyAssessment;
  /** Elos da corrente: `chain[i]` cobre os segmentos 0..i. */
  readonly chain: readonly string[];
  /** Hash do manifesto inteiro (conteúdo + corrente). O selo. */
  readonly rootHash: string;
}

export interface ChainVerification {
  readonly intact: boolean;
  /** Primeiro elo divergente (C3). `null` quando íntegro. */
  readonly firstBrokenIndex: number | null;
  readonly rootMatches: boolean;
}

/* ========================================================================== */
/*  Constantes                                                                */
/* ========================================================================== */

/**
 * Semente da corrente. Fixa e pública: o valor não é segredo, o encadeamento é
 * que dá a garantia. Uma semente aleatória por exportação impediria comparar
 * duas cópias do mesmo material.
 */
export const CUSTODY_GENESIS =
  'visao:custody:v1:0000000000000000000000000000000000000000000000000000000000000000';

/** Descontinuidade abaixo disso é arredondamento de container, não lacuna. */
export const GAP_TOLERANCE_MS = 1_000;

/** Sobreposição abaixo disso é o quadro-chave repetido na borda do trecho. */
export const OVERLAP_TOLERANCE_MS = 1_000;

/**
 * Acima disso o relógio do equipamento é inconfiável para efeito probatório.
 * 5s é o limite prático: abaixo, nenhuma perícia contesta; acima, a ordem dos
 * fatos entre câmeras diferentes deixa de ser demonstrável.
 */
export const CLOCK_SKEW_TOLERANCE_MS = 5_000;

/** Cobertura mínima do intervalo pedido para não rebaixar por lacuna macro. */
export const MIN_COVERAGE_RATIO = 0.98;

const HEX64 = /^[0-9a-f]{64}$/;

/** Transformações que alteram os bytes/pixels entregues. */
const PIXEL_ALTERING: ReadonlySet<TransformationKind> = new Set<TransformationKind>([
  'watermark',
  'transcode',
  'redaction',
]);

/* ========================================================================== */
/*  Canonicalização (C7)                                                      */
/* ========================================================================== */

/**
 * Serializa de forma determinística: chaves ordenadas, sem `undefined`, sem
 * número não finito. Duas execuções sobre o mesmo conteúdo produzem
 * exatamente a mesma string — condição necessária para o hash significar algo.
 */
export function canonicalize(value: unknown): string {
  if (value === null) return 'null';

  const t = typeof value;

  if (t === 'number') {
    const n = value as number;
    if (!Number.isFinite(n)) {
      throw new Error('canonicalize: número não finito não pode ser selado');
    }
    // -0 e 0 devem colidir: são o mesmo fato.
    return Object.is(n, -0) ? '0' : JSON.stringify(n);
  }

  if (t === 'string' || t === 'boolean') return JSON.stringify(value);

  if (t === 'undefined') {
    throw new Error('canonicalize: undefined é ambíguo — use null explícito');
  }

  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalize(v)).join(',')}]`;
  }

  if (t === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`)
      .join(',')}}`;
  }

  throw new Error(`canonicalize: tipo não selável (${t})`);
}

/** Hash padrão SHA-256 via Web Crypto (browser, Deno e Node 18+). */
export const sha256Hex: HashFn = async (bytes: Uint8Array): Promise<string> => {
  const view = new Uint8Array(bytes);
  const digest = await crypto.subtle.digest('SHA-256', view.buffer as ArrayBuffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const encoder = new TextEncoder();

async function hashText(text: string, hashFn: HashFn): Promise<string> {
  return hashFn(encoder.encode(text));
}

/* ========================================================================== */
/*  Tempo                                                                     */
/* ========================================================================== */

/** Converte ISO em epoch ms; devolve `null` (nunca `NaN`) quando inválido. */
export function parseUtc(value: string): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/* ========================================================================== */
/*  Avaliação do valor probatório                                             */
/* ========================================================================== */

function worst(a: CustodyVerdictLevel, b: CustodyVerdictLevel): CustodyVerdictLevel {
  const rank: Record<CustodyVerdictLevel, number> = {
    admissible: 0,
    weakened: 1,
    broken: 2,
  };
  return rank[a] >= rank[b] ? a : b;
}

/**
 * Julga a peça **sem tocar em hash**: hash prova que os bytes não mudaram; esta
 * função avalia se o que foi capturado sustenta o que a peça alega.
 */
export function assessCustody(request: ExportRequest): CustodyAssessment {
  const reasons: CustodyReason[] = [];
  const gaps: TimelineGap[] = [];
  let level: CustodyVerdictLevel = 'admissible';

  const push = (
    lvl: CustodyVerdictLevel,
    code: CustodyReasonCode,
    segmentIndex: number | null,
    detail: string,
  ): void => {
    reasons.push({ code, segmentIndex, detail });
    level = worst(level, lvl);
  };

  const from = parseUtc(request.requestedFromUtc);
  const to = parseUtc(request.requestedToUtc);
  const requestedMs = from !== null && to !== null && to > from ? to - from : 0;

  if (from === null || to === null) {
    push('broken', 'invalid_timestamp', null, 'intervalo solicitado ilegível');
  }

  if (request.requestedBy.trim() === '') {
    push('broken', 'unattributed_export', null, 'exportação sem autor identificado');
  }

  const segments = request.segments;
  if (segments.length === 0) {
    push('broken', 'empty_export', null, 'nenhum segmento na exportação');
  }

  // -- Transformações declaradas × alteração admitida (C4) ------------------
  const alteringDeclared = request.transformations.some((t) => PIXEL_ALTERING.has(t.kind));
  if (request.pixelsAltered && !alteringDeclared) {
    push(
      'broken',
      'undeclared_transformation',
      null,
      'bytes alterados sem transformação declarada',
    );
  }
  if (!request.pixelsAltered && alteringDeclared) {
    // Inverso: declarou marca d'água mas jura que nada mudou. Contradição do
    // próprio produtor — não sabemos qual das duas afirmações é falsa.
    push(
      'broken',
      'declared_without_alteration',
      null,
      'transformação declarada mas produtor afirma bytes intactos',
    );
  }

  // -- Segmento a segmento --------------------------------------------------
  const seenHashes = new Map<string, number>();
  let coveredMs = 0;
  let previousEnd: number | null = null;
  let previousIndex = -1;

  for (let i = 0; i < segments.length; i += 1) {
    const s = segments[i];

    if (s.sha256.trim() === '') {
      push('broken', 'unhashed_segment', i, 'segmento sem impressão digital');
    } else if (!HEX64.test(s.sha256)) {
      push('broken', 'invalid_hash_format', i, `hash fora do formato SHA-256: ${s.sha256}`);
    } else {
      const previousOwner = seenHashes.get(s.sha256);
      if (previousOwner !== undefined) {
        // Mesmo conteúdo duas vezes: ou o mesmo trecho foi anexado em
        // duplicidade, ou a linha do tempo está mentindo sobre duração.
        push(
          'weakened',
          'duplicate_segment',
          i,
          `conteúdo idêntico ao segmento ${previousOwner}`,
        );
      } else {
        seenHashes.set(s.sha256, i);
      }
    }

    if (!Number.isFinite(s.byteSize) || s.byteSize <= 0) {
      push('broken', 'zero_byte_segment', i, 'segmento vazio ou tamanho inválido');
    }

    const start = parseUtc(s.deviceStartUtc);
    const end = parseUtc(s.deviceEndUtc);

    if (start === null || end === null || parseUtc(s.receivedAtUtc) === null) {
      push('broken', 'invalid_timestamp', i, 'carimbo de tempo ilegível');
      continue;
    }

    if (end <= start) {
      push('broken', 'inverted_segment', i, 'fim do trecho não é posterior ao início');
      continue;
    }

    coveredMs += end - start;

    if (Math.abs(s.clockOffsetMs) > CLOCK_SKEW_TOLERANCE_MS) {
      push(
        'weakened',
        'clock_skew',
        i,
        `relógio do equipamento desviado em ${s.clockOffsetMs}ms (registrado, não corrigido)`,
      );
    }

    if (s.index <= previousIndex) {
      push('weakened', 'non_monotonic_order', i, 'índice declarado fora de ordem');
    }
    previousIndex = s.index;

    if (previousEnd !== null) {
      const delta = start - previousEnd;
      if (delta > GAP_TOLERANCE_MS) {
        gaps.push({ afterIndex: i - 1, gapMs: delta });
        push('weakened', 'timeline_gap', i, `lacuna de ${delta}ms antes deste trecho`);
      } else if (delta < -OVERLAP_TOLERANCE_MS) {
        push('weakened', 'timeline_overlap', i, `sobreposição de ${-delta}ms com o anterior`);
      }
    }
    previousEnd = end;
  }

  // -- Cobertura do intervalo pedido ---------------------------------------
  const coverageRatio =
    requestedMs > 0 ? Math.min(1, coveredMs / requestedMs) : segments.length > 0 ? 1 : 0;

  if (requestedMs > 0 && coverageRatio < MIN_COVERAGE_RATIO) {
    push(
      'weakened',
      'partial_coverage',
      null,
      `apenas ${(coverageRatio * 100).toFixed(1)}% do intervalo pedido foi entregue`,
    );
  }

  return { level, reasons, gaps, coveredMs, requestedMs, coverageRatio };
}

/* ========================================================================== */
/*  Corrente e selo                                                           */
/* ========================================================================== */

/** Forma canônica de um segmento dentro da corrente. */
function segmentPayload(s: EvidenceSegment): string {
  return canonicalize({
    byteSize: s.byteSize,
    clockOffsetMs: s.clockOffsetMs,
    deviceEndUtc: s.deviceEndUtc,
    deviceStartUtc: s.deviceStartUtc,
    index: s.index,
    receivedAtUtc: s.receivedAtUtc,
    sha256: s.sha256,
    storagePath: s.storagePath,
  });
}

/**
 * Encadeia os segmentos: `chain[i] = H(chain[i-1] ‖ canonical(seg[i]))`, com
 * `chain[-1] = CUSTODY_GENESIS`. Trocar um segmento invalida ele e todos os
 * posteriores — é isso que torna remoção silenciosa impossível (C3).
 */
export async function buildCustodyChain(
  segments: readonly EvidenceSegment[],
  hashFn: HashFn = sha256Hex,
): Promise<string[]> {
  const chain: string[] = [];
  let previous = CUSTODY_GENESIS;
  for (const segment of segments) {
    previous = await hashText(`${previous}\n${segmentPayload(segment)}`, hashFn);
    chain.push(previous);
  }
  return chain;
}

/** Corpo do manifesto sem o selo — o que o `rootHash` cobre. */
function manifestBody(
  request: ExportRequest,
  assessment: CustodyAssessment,
  chain: readonly string[],
): string {
  return canonicalize({
    assessment: {
      coverageRatio: Number(assessment.coverageRatio.toFixed(6)),
      coveredMs: assessment.coveredMs,
      gaps: assessment.gaps,
      level: assessment.level,
      reasons: assessment.reasons,
      requestedMs: assessment.requestedMs,
    },
    cameraId: request.cameraId,
    chain,
    exportId: request.exportId,
    generatedAtUtc: request.generatedAtUtc,
    pixelsAltered: request.pixelsAltered,
    requestedBy: request.requestedBy,
    requestedFromUtc: request.requestedFromUtc,
    requestedToUtc: request.requestedToUtc,
    segments: request.segments.map((s) => JSON.parse(segmentPayload(s)) as unknown),
    systemVersion: request.systemVersion,
    transformations: request.transformations,
    version: 1,
  });
}

/** Monta o manifesto completo e o sela. */
export async function buildManifest(
  request: ExportRequest,
  hashFn: HashFn = sha256Hex,
): Promise<CustodyManifest> {
  const assessment = assessCustody(request);
  const chain = await buildCustodyChain(request.segments, hashFn);
  const rootHash = await hashText(manifestBody(request, assessment, chain), hashFn);

  return {
    version: 1,
    exportId: request.exportId,
    cameraId: request.cameraId,
    requestedBy: request.requestedBy,
    requestedFromUtc: request.requestedFromUtc,
    requestedToUtc: request.requestedToUtc,
    generatedAtUtc: request.generatedAtUtc,
    systemVersion: request.systemVersion,
    pixelsAltered: request.pixelsAltered,
    segments: request.segments,
    transformations: request.transformations,
    assessment,
    chain,
    rootHash,
  };
}

/**
 * Reconfere um manifesto recebido. Recalcula a corrente e o selo a partir do
 * conteúdo declarado: se alguém editou um segmento, o elo correspondente muda.
 *
 * Reporta apenas o **primeiro** elo divergente (C3) — os seguintes são
 * consequência aritmética, não pistas independentes.
 */
export async function verifyManifest(
  manifest: CustodyManifest,
  hashFn: HashFn = sha256Hex,
): Promise<ChainVerification> {
  const expectedChain = await buildCustodyChain(manifest.segments, hashFn);

  let firstBrokenIndex: number | null = null;
  const limit = Math.max(expectedChain.length, manifest.chain.length);
  for (let i = 0; i < limit; i += 1) {
    if (expectedChain[i] !== manifest.chain[i]) {
      firstBrokenIndex = i;
      break;
    }
  }

  const expectedRoot = await hashText(
    manifestBody(
      {
        exportId: manifest.exportId,
        cameraId: manifest.cameraId,
        requestedBy: manifest.requestedBy,
        requestedFromUtc: manifest.requestedFromUtc,
        requestedToUtc: manifest.requestedToUtc,
        segments: manifest.segments,
        transformations: manifest.transformations,
        pixelsAltered: manifest.pixelsAltered,
        generatedAtUtc: manifest.generatedAtUtc,
        systemVersion: manifest.systemVersion,
      },
      manifest.assessment,
      manifest.chain,
    ),
    hashFn,
  );

  const rootMatches = expectedRoot === manifest.rootHash;

  return {
    intact: firstBrokenIndex === null && rootMatches,
    firstBrokenIndex,
    rootMatches,
  };
}

/* ========================================================================== */
/*  Apresentação                                                              */
/* ========================================================================== */

const REASON_LABEL: Record<CustodyReasonCode, string> = {
  empty_export: 'Exportação sem nenhum trecho de vídeo',
  unattributed_export: 'Exportação sem autor identificado',
  unhashed_segment: 'Trecho sem impressão digital',
  invalid_hash_format: 'Impressão digital em formato inválido',
  invalid_timestamp: 'Carimbo de tempo ilegível',
  inverted_segment: 'Trecho com fim anterior ao início',
  undeclared_transformation: 'Vídeo alterado sem declaração',
  declared_without_alteration: 'Declaração contraditória sobre alteração',
  zero_byte_segment: 'Trecho vazio',
  timeline_gap: 'Lacuna na linha do tempo',
  timeline_overlap: 'Sobreposição entre trechos',
  non_monotonic_order: 'Trechos fora de ordem',
  clock_skew: 'Relógio do equipamento desviado',
  partial_coverage: 'Intervalo pedido coberto apenas em parte',
  duplicate_segment: 'Trecho duplicado',
};

export function describeReason(code: CustodyReasonCode): string {
  return REASON_LABEL[code];
}

const LEVEL_LABEL: Record<CustodyVerdictLevel, string> = {
  admissible: 'Íntegra',
  weakened: 'Íntegra com ressalvas',
  broken: 'Sem valor probatório',
};

export function describeVerdict(level: CustodyVerdictLevel): string {
  return LEVEL_LABEL[level];
}
