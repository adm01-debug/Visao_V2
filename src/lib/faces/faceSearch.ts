/**
 * Onda 197 — Busca de Faces (paridade SIM Next, seção *Face Search*).
 *
 * O sistema já **detectava** faces ao vivo (página de Reconhecimento) e já
 * **guardava** o retrato de cada leitura em `recognition_logs`. O que não
 * existia era a pergunta retroativa que o operador faz de verdade:
 * *"esta pessoa passou aqui na terça à noite?"*. Sem ela, todo o histórico
 * facial era um depósito: escrito por máquina, jamais lido por gente.
 *
 * Este módulo é a **régua única** dessa pergunta. Ele não busca nada — não tem
 * rede, relógio próprio nem I/O. Ele normaliza o critério, decide o que entra
 * no resultado e emite o veredito de cada leitura. O banco e a tela executam
 * essa régua; nunca a reescrevem.
 *
 * ## O que esta régua recusa a fazer
 *
 * 1. **Não transforma suspeita em identificação.** Semelhança é evidência
 *    graduada, não um carimbo. Acima do corte declarado há `identified`;
 *    na faixa de folga ({@link CANDIDATE_MARGIN}) há `candidate` — que o
 *    operador precisa conferir. Nunca se promove candidato a identificado
 *    porque "estava perto".
 *
 * 2. **Não deixa vivacidade duvidosa virar prova.** Leitura marcada como
 *    fraude (`spoofDetected`) é `spoof_suspect` *mesmo com semelhança 0,99* —
 *    um retrato de celular casa perfeitamente com o cadastro, e é exatamente
 *    esse o ataque. Vivacidade baixa (< {@link LIVENESS_FLOOR}) rebaixa
 *    identificação a candidato: nunca a elimina, nunca a confirma.
 *
 * 3. **Não confunde "não sei" com "não é".** Leitura sem semelhança medida
 *    (`similarity === null`) é `unverified`. Exibi-la como "desconhecido"
 *    afirmaria um fato que ninguém apurou — o mesmo pecado que a Onda 159
 *    proibiu na conferência de selo probatório.
 *
 * 4. **Não aceita janela implícita.** Sem período não há busca: varrer "tudo"
 *    num acervo particionado por mês é um convite a varredura sequencial e a
 *    um resultado que ninguém consegue auditar. Fim antes do início, janela no
 *    futuro e janela maior que {@link MAX_WINDOW_DAYS} dias são **recusas
 *    declaradas**, não silenciosamente corrigidas.
 *
 * 5. **Não silencia o atributo ausente.** Filtrar por gênero ou faixa etária
 *    exclui quem não tem o atributo estimado — e isso é dito em voz alta
 *    ({@link UNKNOWN_ATTRIBUTE_POLICY}). Incluir o desconhecido "por
 *    generosidade" faria o operador crer que varreu o acervo inteiro.
 *
 * 6. **Não devolve ordem instável.** Empate de instante é desempatado pelo
 *    identificador. Duas buscas iguais devolvem a mesma página; sem isso a
 *    paginação repete e engole leituras.
 */

/** Faixa de folga abaixo do corte em que a leitura é candidata, nunca identificada. */
export const CANDIDATE_MARGIN = 0.1;

/** Abaixo deste piso de vivacidade, identificação é rebaixada a candidata. */
export const LIVENESS_FLOOR = 0.5;

/** Janela máxima admitida numa única busca. */
export const MAX_WINDOW_DAYS = 31;

/** Corte mínimo/máximo de semelhança aceito como critério. */
export const MIN_SIMILARITY = 0.3;
export const MAX_SIMILARITY = 0.99;

/** Teto de câmeras por busca (protege o plano de execução do banco). */
export const MAX_CAMERAS = 64;

/** Política declarada: registro sem o atributo estimado é EXCLUÍDO do filtro. */
export const UNKNOWN_ATTRIBUTE_POLICY = 'exclude' as const;

export type FaceSearchVerdict =
  /** Semelhança acima do corte, com pessoa cadastrada e vivacidade sem ressalva. */
  | 'identified'
  /** Evidência insuficiente para afirmar; exige conferência humana. */
  | 'candidate'
  /** Semelhança medida e claramente abaixo de qualquer candidatura. */
  | 'unidentified'
  /** Leitura marcada como tentativa de fraude — nunca é identificação. */
  | 'spoof_suspect'
  /** Nada foi medido. "Não sei" — jamais apresentado como "não é". */
  | 'unverified';

export type FaceSearchRejection =
  | 'window_missing'
  | 'window_inverted'
  | 'window_in_future'
  | 'window_too_long'
  | 'similarity_out_of_range'
  | 'age_range_inverted'
  | 'too_many_cameras';

export interface FaceAttributeFilter {
  gender?: 'male' | 'female' | null;
  ageMin?: number | null;
  ageMax?: number | null;
}

export interface RawFaceSearchCriteria {
  fromMs: number | null;
  toMs: number | null;
  cameraIds?: readonly string[] | null;
  personIds?: readonly string[] | null;
  minSimilarity?: number | null;
  attributes?: FaceAttributeFilter | null;
  /** Falso por padrão: fraude suspeita polui a lista de quem passou. */
  includeSpoof?: boolean | null;
}

export interface FaceSearchCriteria {
  readonly fromMs: number;
  readonly toMs: number;
  readonly cameraIds: readonly string[] | null;
  readonly personIds: readonly string[] | null;
  readonly minSimilarity: number;
  readonly attributes: NormalizedAttributeFilter;
  readonly includeSpoof: boolean;
}

export type FaceSearchNormalization =
  | { readonly ok: true; readonly criteria: FaceSearchCriteria }
  | { readonly ok: false; readonly reason: FaceSearchRejection };

export interface FaceObservation {
  readonly id: string;
  readonly timestampMs: number;
  readonly cameraId: string | null;
  readonly personId: string | null;
  readonly personName?: string | null;
  /** Semelhança 0..1. `null` significa "não medida", nunca "zero". */
  readonly similarity: number | null;
  readonly recognized: boolean;
  readonly spoofDetected: boolean;
  readonly livenessScore: number | null;
  readonly ageEstimated: number | null;
  readonly genderEstimated: string | null;
  readonly imageUrl: string | null;
}

export interface FaceSearchResult extends FaceObservation {
  readonly verdict: FaceSearchVerdict;
  /** Motivo legível do veredito — a tela nunca reinventa esta frase. */
  readonly rationale: string;
}

export interface FaceSearchSummary {
  readonly total: number;
  readonly identified: number;
  readonly candidate: number;
  readonly unidentified: number;
  readonly spoofSuspect: number;
  readonly unverified: number;
  /** Fração das leituras em que houve medição (0..1); 0 quando não há leitura. */
  readonly measuredRatio: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const clamp01 = (value: number): number => (value < 0 ? 0 : value > 1 ? 1 : value);

const isFinitePositive = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * Normaliza e valida o critério. Recusa é declarada, nunca corrigida em
 * silêncio: um período "consertado" pelo sistema devolveria um resultado que
 * responde a outra pergunta.
 */
export function normalizeFaceSearchCriteria(
  raw: RawFaceSearchCriteria,
  nowMs: number,
): FaceSearchNormalization {
  const { fromMs, toMs } = raw;

  if (!isFinitePositive(fromMs) || !isFinitePositive(toMs)) {
    return { ok: false, reason: 'window_missing' };
  }
  if (toMs <= fromMs) {
    return { ok: false, reason: 'window_inverted' };
  }
  if (fromMs > nowMs) {
    return { ok: false, reason: 'window_in_future' };
  }
  if (toMs - fromMs > MAX_WINDOW_DAYS * DAY_MS) {
    return { ok: false, reason: 'window_too_long' };
  }

  const similarity = isFinitePositive(raw.minSimilarity) ? raw.minSimilarity : 0.6;
  if (similarity < MIN_SIMILARITY || similarity > MAX_SIMILARITY) {
    return { ok: false, reason: 'similarity_out_of_range' };
  }

  const attrs = raw.attributes ?? {};
  const ageMin = isFinitePositive(attrs.ageMin) ? Math.floor(attrs.ageMin) : null;
  const ageMax = isFinitePositive(attrs.ageMax) ? Math.floor(attrs.ageMax) : null;
  if (ageMin !== null && ageMax !== null && ageMax < ageMin) {
    return { ok: false, reason: 'age_range_inverted' };
  }

  const cameraIds = raw.cameraIds && raw.cameraIds.length > 0 ? [...new Set(raw.cameraIds)] : null;
  if (cameraIds !== null && cameraIds.length > MAX_CAMERAS) {
    return { ok: false, reason: 'too_many_cameras' };
  }

  const personIds = raw.personIds && raw.personIds.length > 0 ? [...new Set(raw.personIds)] : null;

  return {
    ok: true,
    criteria: {
      fromMs,
      // A janela nunca ultrapassa o agora: futuro não tem gravação.
      toMs: Math.min(toMs, nowMs),
      cameraIds,
      personIds,
      minSimilarity: similarity,
      attributes: { gender: attrs.gender ?? null, ageMin, ageMax },
      includeSpoof: raw.includeSpoof === true,
    },
  };
}

/**
 * Decide se a leitura pertence ao recorte pedido. Início inclusivo, fim
 * exclusivo — buscas adjacentes não podem contar a mesma leitura duas vezes.
 */
export function matchesFaceCriteria(
  obs: FaceObservation,
  criteria: FaceSearchCriteria,
): boolean {
  if (obs.timestampMs < criteria.fromMs || obs.timestampMs >= criteria.toMs) return false;
  if (!criteria.includeSpoof && obs.spoofDetected) return false;

  if (criteria.cameraIds !== null) {
    if (obs.cameraId === null || !criteria.cameraIds.includes(obs.cameraId)) return false;
  }
  if (criteria.personIds !== null) {
    if (obs.personId === null || !criteria.personIds.includes(obs.personId)) return false;
  }

  const { gender, ageMin, ageMax } = criteria.attributes;
  if (gender != null) {
    // Política declarada: atributo ausente é excluído, não presumido.
    if (obs.genderEstimated == null) return false;
    if (obs.genderEstimated.toLowerCase() !== gender) return false;
  }
  if (ageMin !== null || ageMax !== null) {
    if (obs.ageEstimated == null) return false;
    if (ageMin !== null && obs.ageEstimated < ageMin) return false;
    if (ageMax !== null && obs.ageEstimated > ageMax) return false;
  }

  return true;
}

/**
 * Emite o veredito de uma leitura. A ordem das guardas é semântica: fraude
 * vence semelhança, ausência de medição vence tudo o mais, e vivacidade baixa
 * só rebaixa — jamais promove.
 */
export function classifyFaceObservation(
  obs: FaceObservation,
  criteria: FaceSearchCriteria,
): FaceSearchResult {
  const base = { ...obs };

  if (obs.spoofDetected) {
    return {
      ...base,
      verdict: 'spoof_suspect',
      rationale: 'Leitura marcada como tentativa de fraude; semelhança não vale como prova.',
    };
  }

  if (obs.similarity === null || !Number.isFinite(obs.similarity)) {
    return {
      ...base,
      verdict: 'unverified',
      rationale: 'Nenhuma semelhança foi medida nesta leitura — indeterminado, não descartado.',
    };
  }

  const similarity = clamp01(obs.similarity);
  const candidateFloor = Math.max(0, criteria.minSimilarity - CANDIDATE_MARGIN);

  if (similarity < candidateFloor) {
    return {
      ...base,
      verdict: 'unidentified',
      rationale: `Semelhança ${(similarity * 100).toFixed(0)}% abaixo do piso de candidatura.`,
    };
  }

  const hasPerson = obs.personId != null;
  if (!hasPerson) {
    return {
      ...base,
      verdict: 'candidate',
      rationale: 'Semelhança relevante sem cadastro vinculado; exige conferência humana.',
    };
  }

  if (similarity < criteria.minSimilarity) {
    return {
      ...base,
      verdict: 'candidate',
      rationale: `Semelhança ${(similarity * 100).toFixed(0)}% dentro da folga do corte; não confirmada.`,
    };
  }

  if (obs.livenessScore !== null && obs.livenessScore < LIVENESS_FLOOR) {
    return {
      ...base,
      verdict: 'candidate',
      rationale: 'Vivacidade abaixo do piso; identificação rebaixada até conferência.',
    };
  }

  return {
    ...base,
    verdict: 'identified',
    rationale: `Semelhança ${(similarity * 100).toFixed(0)}% acima do corte, com cadastro vinculado.`,
  };
}

/** Ordem determinística: mais recente primeiro, empate pelo identificador. */
export function sortFaceResults(results: readonly FaceSearchResult[]): FaceSearchResult[] {
  return [...results].sort((a, b) => {
    if (b.timestampMs !== a.timestampMs) return b.timestampMs - a.timestampMs;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Executa a régua inteira sobre um lote de leituras já lidas do banco. */
export function runFaceSearch(
  observations: readonly FaceObservation[],
  criteria: FaceSearchCriteria,
): FaceSearchResult[] {
  const kept: FaceSearchResult[] = [];
  for (const obs of observations) {
    if (!matchesFaceCriteria(obs, criteria)) continue;
    kept.push(classifyFaceObservation(obs, criteria));
  }
  return sortFaceResults(kept);
}

export function summarizeFaceSearch(results: readonly FaceSearchResult[]): FaceSearchSummary {
  let identified = 0;
  let candidate = 0;
  let unidentified = 0;
  let spoofSuspect = 0;
  let unverified = 0;

  for (const r of results) {
    switch (r.verdict) {
      case 'identified':
        identified += 1;
        break;
      case 'candidate':
        candidate += 1;
        break;
      case 'unidentified':
        unidentified += 1;
        break;
      case 'spoof_suspect':
        spoofSuspect += 1;
        break;
      default:
        unverified += 1;
    }
  }

  const total = results.length;
  return {
    total,
    identified,
    candidate,
    unidentified,
    spoofSuspect,
    unverified,
    measuredRatio: total === 0 ? 0 : (total - unverified) / total,
  };
}

/** Frase de recusa — a tela nunca inventa o motivo de uma busca não feita. */
export function describeRejection(reason: FaceSearchRejection): string {
  switch (reason) {
    case 'window_missing':
      return 'Informe o período da busca: sem janela não há busca.';
    case 'window_inverted':
      return 'O fim do período precisa ser posterior ao início.';
    case 'window_in_future':
      return 'O início do período está no futuro — não há gravação lá.';
    case 'window_too_long':
      return `A janela não pode passar de ${MAX_WINDOW_DAYS} dias.`;
    case 'similarity_out_of_range':
      return `O corte de semelhança precisa ficar entre ${Math.round(MIN_SIMILARITY * 100)}% e ${Math.round(MAX_SIMILARITY * 100)}%.`;
    case 'age_range_inverted':
      return 'A idade máxima precisa ser maior ou igual à mínima.';
    case 'too_many_cameras':
      return `Selecione no máximo ${MAX_CAMERAS} câmeras por busca.`;
    default:
      return 'Critério inválido.';
  }
}
