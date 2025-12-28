import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rateLimit } from '@/middleware/rateLimit';

describe('rateLimit middleware', () => {
  const mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn(), set: vi.fn() };
  const mockNext = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  it('allows requests within limit', () => {
    const mockReq = { ip: '127.0.0.1' };
    const limiter = rateLimit({ max: 100, windowMs: 60000 });
    limiter(mockReq as any, mockRes as any, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('sets rate limit headers', () => {
    const mockReq = { ip: '127.0.0.1' };
    const limiter = rateLimit({ max: 100, windowMs: 60000 });
    limiter(mockReq as any, mockRes as any, mockNext);
    expect(mockRes.set).toHaveBeenCalled();
  });
});
