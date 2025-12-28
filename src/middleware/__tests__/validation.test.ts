import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validationMiddleware } from '@/middleware/validation';

describe('validation middleware', () => {
  const mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const mockNext = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  it('passes valid data', () => {
    const schema = { name: { type: 'string', required: true } };
    const mockReq = { body: { name: 'Test' } };
    validationMiddleware(schema)(mockReq as any, mockRes as any, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('rejects invalid data', () => {
    const schema = { name: { type: 'string', required: true } };
    const mockReq = { body: {} };
    validationMiddleware(schema)(mockReq as any, mockRes as any, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });
});
