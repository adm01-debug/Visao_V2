import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ipWhitelist } from '@/middleware/ipWhitelist';

describe('ipWhitelist middleware', () => {
  const mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const mockNext = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  it('allows whitelisted IP', () => {
    const mockReq = { ip: '127.0.0.1' };
    ipWhitelist(['127.0.0.1'])(mockReq as any, mockRes as any, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('blocks non-whitelisted IP', () => {
    const mockReq = { ip: '192.168.1.1' };
    ipWhitelist(['127.0.0.1'])(mockReq as any, mockRes as any, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });
});
