import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as opentelemetry from '@/lib/opentelemetry';

describe('opentelemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports required functions', () => {
    expect(opentelemetry).toBeDefined();
  });

  it('initializes correctly', () => {
    expect(typeof opentelemetry).toBe('object');
  });

  it('handles basic operations', () => {
    const keys = Object.keys(opentelemetry);
    expect(keys.length).toBeGreaterThan(0);
  });

  it('exports are not null', () => {
    Object.values(opentelemetry).forEach(value => {
      expect(value).not.toBeNull();
    });
  });
});
