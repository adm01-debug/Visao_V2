import { describe, expect, it } from 'vitest';
import {
  AMBIGUITY_MARGIN,
  matchReference,
  safeCosine,
  embeddingNorm,
  type GalleryEntry,
  type ReferenceQuery,
} from '@/lib/faces/referenceMatch';

const MODEL = 'arcface_r100_v1';

const vec = (angle: number): number[] => [Math.cos(angle), Math.sin(angle), 0];

const entry = (over: Partial<GalleryEntry> = {}): GalleryEntry => ({
  id: 'g1',
  personId: 'p1',
  personName: 'Fulano',
  embedding: vec(0),
  modelVersion: MODEL,
  qualityScore: 0.9,
  ...over,
});

const query = (over: Partial<ReferenceQuery> = {}): ReferenceQuery => ({
  embedding: vec(0),
  modelVersion: MODEL,
  livenessScore: 0.9,
  spoofDetected: false,
  ...over,
});

describe('safeCosine / embeddingNorm', () => {
  it('não mede vetor degenerado nem dimensão diferente', () => {
    expect(embeddingNorm([0, 0, 0])).toBeNull();
    expect(safeCosine([1, 0], [1, 0, 0])).toBeNull();
    expect(safeCosine([0, 0, 0], [1, 0, 0])).toBeNull();
  });

  it('mede identidade como 1', () => {
    expect(safeCosine([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10);
  });
});

describe('matchReference — recusas declaradas', () => {
  it('recusa vetor ausente, degenerado, corte fora da faixa e galeria vazia', () => {
    expect(matchReference(query({ embedding: [] }), [entry()])).toMatchObject({
      ok: false,
      reason: 'query_embedding_missing',
    });
    expect(matchReference(query({ embedding: [0, 0, 0] }), [entry()])).toMatchObject({
      ok: false,
      reason: 'query_embedding_degenerate',
    });
    expect(matchReference(query(), [entry()], 0.05)).toMatchObject({
      ok: false,
      reason: 'threshold_out_of_range',
    });
    expect(matchReference(query(), [])).toMatchObject({ ok: false, reason: 'empty_gallery' });
  });
});

describe('matchReference — vereditos', () => {
  it('modelo diferente é incomparável, nunca semelhança baixa', () => {
    const r = matchReference(query(), [entry({ modelVersion: 'face-api-128' })]);
    expect(r.ok && r.outcome.matches[0]).toMatchObject({ verdict: 'incomparable', similarity: null });
    expect(r.ok && r.outcome.best).toBeNull();
    expect(r.ok && r.outcome.incomparableCount).toBe(1);
  });

  it('fraude na foto de referência vence semelhança perfeita', () => {
    const r = matchReference(query({ spoofDetected: true }), [entry()]);
    expect(r.ok && r.outcome.matches[0]?.verdict).toBe('spoof_suspect');
    expect(r.ok && r.outcome.degradedByQuery).toBe(true);
  });

  it('empate entre primeiro e segundo acima do corte é ambíguo', () => {
    const r = matchReference(query(), [
      entry({ id: 'a', personId: 'pa', embedding: vec(0.01) }),
      entry({ id: 'b', personId: 'pb', embedding: vec(0.02) }),
    ]);
    expect(r.ok && r.outcome.matches[0]?.verdict).toBe('ambiguous');
  });

  it('vivacidade baixa rebaixa o melhor resultado a candidato', () => {
    const r = matchReference(query({ livenessScore: 0.2 }), [entry()]);
    expect(r.ok && r.outcome.matches[0]?.verdict).toBe('candidate');
  });

  it('identifica quando isolado do segundo colocado', () => {
    const r = matchReference(query(), [
      entry({ id: 'a', embedding: vec(0) }),
      entry({ id: 'b', personId: 'pb', embedding: vec(Math.PI / 2) }),
    ]);
    expect(r.ok && r.outcome.matches[0]?.verdict).toBe('identified');
    expect(r.ok && r.outcome.matches[1]?.verdict).toBe('unidentified');
    expect(r.ok && (r.outcome.best?.similarity ?? 0)).toBeGreaterThan(0.99);
  });

  it('desempata pelo identificador quando a semelhança é idêntica', () => {
    const r = matchReference(query(), [
      entry({ id: 'z', personId: 'pz' }),
      entry({ id: 'a', personId: 'pa' }),
    ]);
    expect(r.ok && r.outcome.matches.map((m) => m.id)).toEqual(['a', 'z']);
    expect(AMBIGUITY_MARGIN).toBeGreaterThan(0);
  });
});
