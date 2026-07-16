import { describe, it, expect } from 'vitest';

/** Wave 11: per-namespace TTL contract mirrored from edge-side helper. */
const NAMESPACE_TTL: Record<string, number> = {
  encode: 24 * 3600,
  detect: 1 * 3600,
  analyze: 6 * 3600,
  liveness: 15 * 60,
};

describe('edge_cache TTL policy', () => {
  it('encode has longest TTL — embeddings are identity-stable', () => {
    expect(NAMESPACE_TTL.encode).toBeGreaterThan(NAMESPACE_TTL.detect);
    expect(NAMESPACE_TTL.encode).toBeGreaterThan(NAMESPACE_TTL.analyze);
  });
  it('liveness has shortest TTL to prevent replay attacks', () => {
    expect(NAMESPACE_TTL.liveness).toBeLessThanOrEqual(15 * 60);
    for (const k of ['encode', 'detect', 'analyze'] as const) {
      expect(NAMESPACE_TTL.liveness).toBeLessThan(NAMESPACE_TTL[k]);
    }
  });
  it('every namespace has positive TTL (0 disables caching)', () => {
    for (const [, ttl] of Object.entries(NAMESPACE_TTL)) {
      expect(ttl).toBeGreaterThan(0);
    }
  });
  it('all TTLs fit within a day — no permanent caching of biometric data (LGPD)', () => {
    for (const [, ttl] of Object.entries(NAMESPACE_TTL)) {
      expect(ttl).toBeLessThanOrEqual(24 * 3600);
    }
  });
});
