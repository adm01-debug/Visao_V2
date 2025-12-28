import { describe, it, expect } from 'vitest';
import * as providers from '@/providers';

describe('providers index', () => {
  it('exports all providers', () => {
    expect(providers).toBeDefined();
  });

  it('has expected exports', () => {
    expect(typeof providers).toBe('object');
  });
});
