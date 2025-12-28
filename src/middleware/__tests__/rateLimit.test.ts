import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rateLimit } from '@/middleware/rateLimit';

describe('rateLimit middleware', () => {
  const mockNext = vi.fn();
  const mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn(), set: vi.fn() };

  beforeEach(() => vi.clearAllMocks());

  it('allows requests within limit', () => {
    const middleware = rateLimit({ windowMs: 60000, max: 100 });
    const req = { ip: '192.168.1.1' };
    middleware(req as any, mockRes as any, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('blocks requests exceeding limit', () => {
    const middleware = rateLimit({ windowMs: 60000, max: 1 });
    const req = { ip: '192.168.1.1' };
    middleware(req as any, mockRes as any, mockNext);
    vi.clearAllMocks();
    middleware(req as any, mockRes as any, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(429);
  });

  it('sets rate limit headers', () => {
    const middleware = rateLimit({ windowMs: 60000, max: 100 });
    const req = { ip: '192.168.1.1' };
    middleware(req as any, mockRes as any, mockNext);
    expect(mockRes.set).toHaveBeenCalled();
  });

  it('uses custom key generator', () => {
    const keyGenerator = vi.fn().mockReturnValue('custom-key');
    const middleware = rateLimit({ windowMs: 60000, max: 100, keyGenerator });
    const req = { ip: '192.168.1.1' };
    middleware(req as any, mockRes as any, mockNext);
    expect(keyGenerator).toHaveBeenCalled();
  });
});
