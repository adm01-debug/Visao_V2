import { describe, it, expect } from 'vitest';
import * as middlewares from '@/middleware';

describe('middleware index', () => {
  it('exports all middlewares', () => {
    expect(middlewares).toBeDefined();
  });

  it('has expected exports', () => {
    expect(typeof middlewares).toBe('object');
  });
});
