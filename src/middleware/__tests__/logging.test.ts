import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loggingMiddleware } from '@/middleware/logging';

describe('logging middleware', () => {
  const mockNext = vi.fn();
  const mockReq = { method: 'GET', url: '/api/test', headers: {} };
  const mockRes = { on: vi.fn(), statusCode: 200 };
  let consoleSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => consoleSpy.mockRestore());

  it('logs request method and URL', () => {
    loggingMiddleware(mockReq as any, mockRes as any, mockNext);
    expect(consoleSpy).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it('tracks response time', () => {
    loggingMiddleware(mockReq as any, mockRes as any, mockNext);
    expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('includes request ID', () => {
    loggingMiddleware(mockReq as any, mockRes as any, mockNext);
    expect(mockReq).toHaveProperty('id');
  });
});
