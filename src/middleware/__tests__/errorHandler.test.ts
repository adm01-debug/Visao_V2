import { describe, it, expect, vi } from 'vitest';
import { errorHandler } from '@/middleware/errorHandler';

describe('errorHandler middleware', () => {
  const mockNext = vi.fn();
  const mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const mockReq = {};

  it('handles standard errors', () => {
    const error = new Error('Test error');
    errorHandler(error, mockReq as any, mockRes as any, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Test error' }));
  });

  it('handles errors with status code', () => {
    const error = { message: 'Not found', statusCode: 404 };
    errorHandler(error as any, mockReq as any, mockRes as any, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(404);
  });

  it('handles validation errors', () => {
    const error = { message: 'Validation failed', type: 'ValidationError', errors: [] };
    errorHandler(error as any, mockReq as any, mockRes as any, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('logs errors in development', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Dev error');
    errorHandler(error, mockReq as any, mockRes as any, mockNext);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
