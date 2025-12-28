import { describe, it, expect } from 'vitest';
import * as middlewares from '@/middleware';

describe('middleware index', () => {
  it('exports all middlewares', () => {
    expect(middlewares).toBeDefined();
  });

  it('exports auth middleware', () => {
    expect(middlewares.authMiddleware).toBeDefined();
  });

  it('exports errorHandler middleware', () => {
    expect(middlewares.errorHandler).toBeDefined();
  });

  it('exports rateLimit middleware', () => {
    expect(middlewares.rateLimit).toBeDefined();
  });

  it('exports validation middleware', () => {
    expect(middlewares.validate).toBeDefined();
  });
});
