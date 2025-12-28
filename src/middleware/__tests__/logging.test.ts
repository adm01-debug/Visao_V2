import { describe, it, expect, vi } from 'vitest';
import { loggingMiddleware } from '@/middleware/logging';

describe('logging middleware', () => {
  const mockReq = { method: 'GET', url: '/test', ip: '127.0.0.1' };
  const mockRes = { on: vi.fn() };
  const mockNext = vi.fn();

  it('logs request', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    loggingMiddleware(mockReq as any, mockRes as any, mockNext);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('calls next', () => {
    loggingMiddleware(mockReq as any, mockRes as any, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});
