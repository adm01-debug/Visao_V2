import { describe, it, expect, vi } from 'vitest';
import { validate } from '@/middleware/validation';

describe('validation middleware', () => {
  const mockNext = vi.fn();
  const mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn() };

  it('passes valid data', () => {
    const schema = { body: { name: { type: 'string', required: true } } };
    const middleware = validate(schema);
    const req = { body: { name: 'Test' } };
    middleware(req as any, mockRes as any, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('rejects invalid data', () => {
    const schema = { body: { name: { type: 'string', required: true } } };
    const middleware = validate(schema);
    const req = { body: {} };
    middleware(req as any, mockRes as any, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('validates query params', () => {
    const schema = { query: { page: { type: 'number' } } };
    const middleware = validate(schema);
    const req = { query: { page: 'invalid' } };
    middleware(req as any, mockRes as any, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('returns detailed errors', () => {
    const schema = { body: { email: { type: 'email', required: true } } };
    const middleware = validate(schema);
    const req = { body: { email: 'invalid' } };
    middleware(req as any, mockRes as any, mockNext);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ errors: expect.any(Array) }));
  });
});
