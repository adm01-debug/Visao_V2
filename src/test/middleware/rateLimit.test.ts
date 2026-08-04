import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rateLimitMiddleware } from '@/middleware/rateLimit';

describe('rateLimitMiddleware', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('allows requests within limit', () => {
    const check = rateLimitMiddleware(3, 1000);
    expect(check('1.2.3.4')).toBe(true);
    expect(check('1.2.3.4')).toBe(true);
    expect(check('1.2.3.4')).toBe(true);
  });

  it('blocks requests over limit', () => {
    const check = rateLimitMiddleware(2, 1000);
    check('10.0.0.1');
    check('10.0.0.1');
    expect(check('10.0.0.1')).toBe(false);
  });

  it('different IPs have separate limits', () => {
    const check = rateLimitMiddleware(1, 1000);
    expect(check('a')).toBe(true);
    expect(check('b')).toBe(true);
    expect(check('a')).toBe(false);
    expect(check('b')).toBe(false);
  });

  it('resets after window expires', () => {
    const check = rateLimitMiddleware(1, 500);
    expect(check('reset')).toBe(true);
    expect(check('reset')).toBe(false);
    vi.advanceTimersByTime(501);
    expect(check('reset')).toBe(true);
  });

  it('default limit is 100', () => {
    const check = rateLimitMiddleware();
    for (let i = 0; i < 100; i++) {
      expect(check('default')).toBe(true);
    }
    expect(check('default')).toBe(false);
  });

  it('high concurrency stress test', () => {
    const check = rateLimitMiddleware(1000, 60000);
    let allowed = 0;
    for (let i = 0; i < 1500; i++) {
      if (check('stress')) allowed++;
    }
    expect(allowed).toBe(1000);
  });
});
