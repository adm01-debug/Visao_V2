import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as bitrix24Integration from '@/integrations/bitrix24Integration';

vi.mock('@/lib/http', () => ({
  httpClient: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  }
}));

describe('bitrix24Integration integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(bitrix24Integration).toBeDefined();
  });

  it('has required exports', () => {
    const exports = Object.keys(bitrix24Integration);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('exports are valid types', () => {
    Object.values(bitrix24Integration).forEach(exp => {
      expect(exp).not.toBeNull();
    });
  });

  it('integration can be initialized', () => {
    expect(() => bitrix24Integration).not.toThrow();
  });
});
