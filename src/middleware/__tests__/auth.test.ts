import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authMiddleware } from '@/middleware/auth';

describe('auth middleware', () => {
  const mockReq = { headers: {}, cookies: {} };
  const mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const mockNext = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  it('passes with valid token', async () => {
    mockReq.headers = { authorization: 'Bearer valid-token' };
    await authMiddleware(mockReq as any, mockRes as any, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('rejects without token', async () => {
    mockReq.headers = {};
    await authMiddleware(mockReq as any, mockRes as any, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });

  it('handles malformed token', async () => {
    mockReq.headers = { authorization: 'Invalid' };
    await authMiddleware(mockReq as any, mockRes as any, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });
});
