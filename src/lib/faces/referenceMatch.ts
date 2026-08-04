/**
 * Onda 198 — Busca por imagem de referência (1:N sobre o acervo de faces).
 *
 * A Onda 197 respondeu "quem passou aqui nesta janela?". Falta a pergunta que
 * o operador faz com uma foto na mão: **"esta pessoa passou aqui?"**. Isso é
 * uma comparação 1:N entre o vetor da foto de referência e a galeria de
 * vetores já cadastrados (`face_embeddings`).
 *
 * Este módulo é a **régua única** dessa comparação. Ele é puro: sem rede, sem
 * relógio, sem banco. Quem extrai o vetor é o serviço de encoding; quem lê a
 * galeria é o hook. O julgamento — e só ele — mora aqui.
 *
 * ## O que esta régua se recusa a fazer
 *
 * 1. **Não compara vetores de modelos diferentes.** Cosseno entre ArcFace
 *    r100 e face-api-128 é um número bem definido e completamente sem
 *    significado. Entrada de galeria com `modelVersion` diferente é
 *    `incomparable` — nunca "similaridade 0,03", que o operador leria como
 *    "não é a pessoa".
 *
 * 2. **Não compara dimensões diferentes.** Vetor de tamanho distinto é recusa
 *    declarada ({@link ReferenceMatchRejection}), não truncamento.
 *
 * 3. **Não aceita vetor degenerado.** Norma zero (ou não finita) produziria
 *    denominador zero; o cosseno "0" resultante é ausência de medição, não
 *    ausência de semelhança. Recusa declarada.
 *
 * 4. **Não decide no empate.** Se o primeiro e o segundo colocados estão a
 *    menos de {@link AMBIGUITY_MARGIN} um do outro, o veredito é `ambiguous`.
 *    Duas pessoas parecidas acima do corte é exatamente o caso em que uma
 *    identificação automática vira acusação errada.
 *
 * 5. **Não promove por qualidade duvidosa.** Foto de referência com fraude
 *    detectada nunca identifica ninguém (`spoof_suspect` global) e vivacidade
 *    abaixo do piso rebaixa o melhor resultado a candidato — a mesma regra da
 *    Onda 197, aqui aplicada à *consulta* e não à leitura.
 *
 * 6. **Não devolve ordem instável.** Semelhança desc, empate pelo id asc.
 *
 * 7. **Não esconde o que não pôde medir.** As entradas incomparáveis são
 *    contadas e informadas: uma galeria meio migrada que devolve "nada
 *    encontrado" faria o operador concluir ausência a partir de silêncio.
 */

import type { InsightFaceModel } from '@/lib/insightface/types';

/** Corte padrão de identificação para ArcFace (cosseno). */
export const DEFAULT_MATCH_THRESHOLD = 0.5;

/** Faixa de folga abaixo do corte que produz candidato, nunca identificação. */
export const REFERENCE_CANDIDATE_MARGIN = 0.1;

/** Distância mínima entre 1º e 2º colocados para que o 1º possa ser afirmado. */
export const AMBIGUITY_MARGIN = 0.05;

/** Piso de vivacidade da foto de referência; abaixo disso só há candidato. */
export const REFERENCE_LIVENESS_FLOOR = 0.5;

/** Limites aceitos para o corte informado pelo operador. */
export const MIN_MATCH_THRESHOLD = 0.3;
export const MAX_MATCH_THRESHOLD = 0.99;

/** Teto de resultados devolvidos por consulta. */
export const MAX_MATCHES = 25;

export type ReferenceMatchRejection =
  | 'query_embedding_missing'
  | 'query_embedding_degenerate'
  | 'threshold_out_of_range'
  | 'empty_gallery';

export type ReferenceMatchVerdict =
  /** Acima do corte, isolado do segundo colocado e sem ressalva de qualidade. */
  | 'identified'
  /** Evidência relevante que exige conferência humana. */
  | 'candidate'
  /** Dois ou mais candidatos empatados acima do corte. */
  | 'ambiguous'
  /** Medido e claramente abaixo de qualquer candidatura. */
  | 'unidentified'
  /** Foto de referência marcada como fraude — nada é afirmado. */
  | 'spoof_suspect'
  /** Modelo ou dimensão incompatíveis: não foi medido. Jamais "não é". */
  | 'incomparable';

export interface ReferenceQuery {
  readonly embedding: readonly number[];
  readonly modelVersion: InsightFaceModel | string;
  /** Vivacidade da foto de referência, quando medida. */
  readonly livenessScore?: number | null;
  /** Fraude detectada na foto de referência. */
  readonly spoofDetected?: boolean;
}

export interface GalleryEntry {
  readonly id: string;
  readonly personId: string;
  readonly personName: string | null;
  readonly embedding: readonly number[];
  readonly modelVersion: string;
  readonly qualityScore: number | null;
}

export interface ReferenceMatch {
  readonly id: string;
  readonly personId: string;
  readonly personName: string | null;
  /** `null` quando não foi possível medir (modelo/dimensão incompatíveis). */
  readonly similarity: number | null;
  readonly distance: number | null;
  readonly verdict: ReferenceMatchVerdict;
  readonly rationale: string;
}

export interface ReferenceMatchOutcome {
  readonly matches: readonly ReferenceMatch[];
  /** Melhor resultado comparável, ou `null` se nada pôde ser medido. */
  readonly best: ReferenceMatch | null;
  readonly comparedCount: number;
  readonly incomparableCount: number;
  /** Corte efetivamente usado. */
  readonly threshold: number;
  /** Verdadeiro quando o veredito global foi rebaixado pela foto de consulta. */
  readonly degradedByQuery: boolean;
}

export type ReferenceMatchResponse =
  | { readonly ok: true; readonly outcome: ReferenceMatchOutcome }
  | { readonly ok: false; readonly reason: ReferenceMatchRejection };

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Norma euclidiana; `null` quando o vetor não é utilizável. */
export function embeddingNorm(vec: readonly number[]): number | null {
  if (vec.length === 0) return null;
  let sum = 0;
  for (const v of vec) {
    if (!isFiniteNumber(v)) return null;
    sum += v * v;
  }
  const norm = Math.sqrt(sum);
  return norm > 0 ? norm : null;
}

/**
 * Cosseno entre dois vetores. Devolve `null` — e não zero — quando a
 * comparação não é possível. Zero significaria "ortogonais", isto é, medido.
 */
export function safeCosine(a: readonly number[], b: readonly number[]): number | null {
  if (a.length !== b.length) return null;
  const na = embeddingNorm(a);
  const nb = embeddingNorm(b);
  if (na === null || nb === null) return null;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += (a[i] as number) * (b[i] as number);
  const cos = dot / (na * nb);
  if (!Number.isFinite(cos)) return null;
  return cos < -1 ? -1 : cos > 1 ? 1 : cos;
}

const pct = (v: number): string => `${(v * 100).toFixed(0)}%`;

/**
 * Executa a comparação 1:N. Toda recusa é declarada; nenhuma é corrigida em
 * silêncio.
 */
export function matchReference(
  query: ReferenceQuery,
  gallery: readonly GalleryEntry[],
  rawThreshold: number = DEFAULT_MATCH_THRESHOLD
): ReferenceMatchResponse {
  if (!Array.isArray(query.embedding) || query.embedding.length === 0) {
    return { ok: false, reason: 'query_embedding_missing' };
  }
  if (embeddingNorm(query.embedding) === null) {
    return { ok: false, reason: 'query_embedding_degenerate' };
  }
  const threshold = isFiniteNumber(rawThreshold) ? rawThreshold : DEFAULT_MATCH_THRESHOLD;
  if (threshold < MIN_MATCH_THRESHOLD || threshold > MAX_MATCH_THRESHOLD) {
    return { ok: false, reason: 'threshold_out_of_range' };
  }
  if (gallery.length === 0) {
    return { ok: false, reason: 'empty_gallery' };
  }

  const spoof = query.spoofDetected === true;
  const lowLiveness =
    isFiniteNumber(query.livenessScore) && query.livenessScore < REFERENCE_LIVENESS_FLOOR;

  const scored: Array<{ entry: GalleryEntry; similarity: number | null }> = gallery.map((entry) => {
    if (entry.modelVersion !== query.modelVersion) {
      return { entry, similarity: null };
    }
    return { entry, similarity: safeCosine(query.embedding, entry.embedding) };
  });

  const comparable = scored.filter((s) => s.similarity !== null);
  const incomparable = scored.filter((s) => s.similarity === null);

  // Ordem determinística: semelhança desc, empate pelo id asc.
  comparable.sort((x, y) => {
    const d = (y.similarity as number) - (x.similarity as number);
    if (d !== 0) return d;
    return x.entry.id < y.entry.id ? -1 : x.entry.id > y.entry.id ? 1 : 0;
  });

  const top = comparable[0]?.similarity ?? null;
  const second = comparable[1]?.similarity ?? null;
  const candidateFloor = Math.max(0, threshold - REFERENCE_CANDIDATE_MARGIN);
  const ambiguousTop =
    top !== null && second !== null && top >= threshold && top - second < AMBIGUITY_MARGIN;

  const decide = (
    similarity: number,
    isTop: boolean
  ): { verdict: ReferenceMatchVerdict; rationale: string } => {
    if (spoof) {
      return {
        verdict: 'spoof_suspect',
        rationale: 'Foto de referência marcada como fraude; nenhuma semelhança vale como prova.',
      };
    }
    if (similarity < candidateFloor) {
      return {
        verdict: 'unidentified',
        rationale: `Semelhança ${pct(similarity)} abaixo do piso de candidatura.`,
      };
    }
    if (similarity < threshold) {
      return {
        verdict: 'candidate',
        rationale: `Semelhança ${pct(similarity)} dentro da folga do corte; não confirmada.`,
      };
    }
    if (isTop && ambiguousTop) {
      return {
        verdict: 'ambiguous',
        rationale: 'Primeiro e segundo colocados empatados acima do corte; exige conferência.',
      };
    }
    if (!isTop) {
      return {
        verdict: 'candidate',
        rationale: `Semelhança ${pct(similarity)} acima do corte, mas não é o melhor resultado.`,
      };
    }
    if (lowLiveness) {
      return {
        verdict: 'candidate',
        rationale: 'Vivacidade da foto de referência abaixo do piso; identificação rebaixada.',
      };
    }
    return {
      verdict: 'identified',
      rationale: `Semelhança ${pct(similarity)} acima do corte e isolada do segundo colocado.`,
    };
  };

  const matches: ReferenceMatch[] = [];

  comparable.slice(0, MAX_MATCHES).forEach((s, index) => {
    const similarity = s.similarity as number;
    const { verdict, rationale } = decide(similarity, index === 0);
    matches.push({
      id: s.entry.id,
      personId: s.entry.personId,
      personName: s.entry.personName,
      similarity,
      distance: 1 - similarity,
      verdict,
      rationale,
    });
  });

  // As incomparáveis entram no fim, explicitamente marcadas: silêncio de
  // galeria meio migrada jamais pode ser lido como ausência da pessoa.
  for (const s of incomparable.slice(0, Math.max(0, MAX_MATCHES - matches.length))) {
    matches.push({
      id: s.entry.id,
      personId: s.entry.personId,
      personName: s.entry.personName,
      similarity: null,
      distance: null,
      verdict: 'incomparable',
      rationale: `Cadastro em outro modelo (${s.entry.modelVersion}); comparação não foi feita.`,
    });
  }

  const best = matches.find((m) => m.similarity !== null) ?? null;

  return {
    ok: true,
    outcome: {
      matches,
      best,
      comparedCount: comparable.length,
      incomparableCount: incomparable.length,
      threshold,
      degradedByQuery: spoof || lowLiveness,
    },
  };
}

/** Frase de recusa — a tela nunca inventa o motivo de uma busca não feita. */
export function describeReferenceRejection(reason: ReferenceMatchRejection): string {
  switch (reason) {
    case 'query_embedding_missing':
      return 'Nenhum rosto utilizável foi extraído da imagem de referência.';
    case 'query_embedding_degenerate':
      return 'O vetor extraído é inválido (norma nula); refaça a captura.';
    case 'threshold_out_of_range':
      return `O corte precisa ficar entre ${Math.round(MIN_MATCH_THRESHOLD * 100)}% e ${Math.round(MAX_MATCH_THRESHOLD * 100)}%.`;
    case 'empty_gallery':
      return 'Não há cadastros faciais para comparar.';
    default:
      return 'Comparação inválida.';
  }
}
