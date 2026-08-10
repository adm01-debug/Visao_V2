import { describe, it, expect } from 'vitest';

/**
 * Wave 10: cache key derivation contract.
 * Mirrors supabase/functions/_shared/insightface-cache.ts.
 */
function cacheKey(namespace: string, modelVersion: string, hash: string): string {
  return `if-enc:${namespace}:${modelVersion}:${hash}`;
}

describe('insightface cache key', () => {
  it('namespaces per operation', () => {
    expect(cacheKey('encode', 'v1', 'abc')).not.toBe(cacheKey('detect', 'v1', 'abc'));
  });
  it('invalidates on model version bump', () => {
    expect(cacheKey('encode', 'v1', 'abc')).not.toBe(cacheKey('encode', 'v2', 'abc'));
  });
  it('collides only on identical hash+version+namespace', () => {
    expect(cacheKey('encode', 'v1', 'abc')).toBe(cacheKey('encode', 'v1', 'abc'));
  });
  it('produces stable prefix for observability', () => {
    expect(cacheKey('encode', 'v1', 'abc').startsWith('if-enc:')).toBe(true);
  });
});
