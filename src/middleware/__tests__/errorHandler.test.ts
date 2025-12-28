import { describe, it, expect, vi } from 'vitest';
import { errorHandler } from '@/middleware/errorHandler';

describe('errorHandler middleware', () => {
  const mockReq = {};
  const mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const mockNext = vi.fn();

  it('handles errors', () => {
    const error = new Error('Test error');
    errorHandler(error, mockReq as any, mockRes as any, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

  it('handles custom status codes', () => {
    const error = { statusCode: 404, message: 'Not found' };
    errorHandler(error as any, mockReq as any, mockRes as any, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(404);
  });

  it('returns error message', () => {
    const error = new Error('Test message');
    errorHandler(error, mockReq as any, mockRes as any, mockNext);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Test message' }));
  });
});
