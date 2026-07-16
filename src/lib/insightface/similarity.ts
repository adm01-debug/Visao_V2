/**
 * VISÃO - InsightFace similarity utilities.
 * Cosine similarity on 512D ArcFace embeddings.
 */

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Embedding dimension mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i]!;
    const bv = b[i]!;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/** Cosine distance = 1 - similarity. ArcFace typical match threshold ~0.5. */
export function cosineDistance(a: readonly number[], b: readonly number[]): number {
  return 1 - cosineSimilarity(a, b);
}

export interface MatchCandidate<T> {
  item: T;
  embedding: readonly number[];
}

export interface MatchResult<T> {
  item: T;
  similarity: number;
  distance: number;
  isMatch: boolean;
}

/**
 * Find top-K matches by cosine similarity.
 * `threshold` is expressed as similarity (0..1); default 0.5 (ArcFace standard).
 */
export function topKMatches<T>(
  query: readonly number[],
  candidates: readonly MatchCandidate<T>[],
  k = 5,
  threshold = 0.5,
): MatchResult<T>[] {
  const scored: MatchResult<T>[] = candidates.map((c) => {
    const similarity = cosineSimilarity(query, c.embedding);
    return {
      item: c.item,
      similarity,
      distance: 1 - similarity,
      isMatch: similarity >= threshold,
    };
  });
  scored.sort((x, y) => y.similarity - x.similarity);
  return scored.slice(0, k);
}
