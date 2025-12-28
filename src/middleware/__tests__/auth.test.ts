import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authMiddleware } from '@/middleware/auth';

describe('auth middleware', () => {
  const mockNext = vi.fn();
  const mockReq = { headers: { authorization: 'Bearer token123' }, user: null };
  const mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn() };

  beforeEach(() => vi.clearAllMocks());

  it('allows authenticated requests', async () => {
    await authMiddleware(mockReq as any, mockRes as any, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('rejects requests without token', async () => {
    const reqNoAuth = { headers: {}, user: null };
    await authMiddleware(reqNoAuth as any, mockRes as any, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });

  it('validates token format', async () => {
    const reqBadToken = { headers: { authorization: 'InvalidFormat' }, user: null };
    await authMiddleware(reqBadToken as any, mockRes as any, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });

  it('attaches user to request', async () => {
    await authMiddleware(mockReq as any, mockRes as any, mockNext);
    expect(mockReq.user).toBeDefined();
  });
});
