import { describe, it, expect } from 'vitest';
import { cosineSimilarity, cosineDistance, topKMatches } from '@/lib/insightface/similarity';

describe('insightface/similarity', () => {
  it('cosineSimilarity returns 1 for identical vectors', () => {
    const v = [1, 2, 3, 4];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1);
  });

  it('cosineSimilarity returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('cosineSimilarity returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it('cosineDistance = 1 - similarity', () => {
    expect(cosineDistance([1, 0], [0, 1])).toBeCloseTo(1);
  });

  it('cosineSimilarity handles zero vector safely', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });

  it('cosineSimilarity throws on dim mismatch', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(/dimension/i);
  });

  it('topKMatches sorts by similarity and applies threshold', () => {
    const query = [1, 0, 0];
    const candidates = [
      { item: 'a', embedding: [1, 0, 0] },
      { item: 'b', embedding: [0, 1, 0] },
      { item: 'c', embedding: [0.9, 0.1, 0] },
    ];
    const result = topKMatches(query, candidates, 3, 0.5);
    expect(result[0]!.item).toBe('a');
    expect(result[0]!.isMatch).toBe(true);
    expect(result[1]!.item).toBe('c');
    expect(result[1]!.isMatch).toBe(true);
    expect(result[2]!.item).toBe('b');
    expect(result[2]!.isMatch).toBe(false);
  });

  it('topKMatches respects k', () => {
    const query = [1, 0];
    const cands = Array.from({ length: 10 }, (_, i) => ({
      item: i,
      embedding: [Math.cos(i / 10), Math.sin(i / 10)],
    }));
    expect(topKMatches(query, cands, 3).length).toBe(3);
  });

  it('handles 512D embeddings without overflow', () => {
    const a = Array.from({ length: 512 }, () => Math.random() - 0.5);
    const b = Array.from({ length: 512 }, () => Math.random() - 0.5);
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThanOrEqual(-1);
    expect(sim).toBeLessThanOrEqual(1);
  });
});
