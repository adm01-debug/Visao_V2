import { describe, it, expect, vi } from 'vitest';
import { ipWhitelist } from '@/middleware/ipWhitelist';

describe('ipWhitelist middleware', () => {
  const mockNext = vi.fn();
  const mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn() };

  it('allows whitelisted IPs', () => {
    const req = { ip: '192.168.1.1' };
    const middleware = ipWhitelist(['192.168.1.1']);
    middleware(req as any, mockRes as any, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('blocks non-whitelisted IPs', () => {
    const req = { ip: '10.0.0.1' };
    const middleware = ipWhitelist(['192.168.1.1']);
    middleware(req as any, mockRes as any, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  it('supports CIDR notation', () => {
    const req = { ip: '192.168.1.50' };
    const middleware = ipWhitelist(['192.168.1.0/24']);
    middleware(req as any, mockRes as any, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('handles x-forwarded-for header', () => {
    const req = { ip: '127.0.0.1', headers: { 'x-forwarded-for': '192.168.1.1' } };
    const middleware = ipWhitelist(['192.168.1.1'], { trustProxy: true });
    middleware(req as any, mockRes as any, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});
