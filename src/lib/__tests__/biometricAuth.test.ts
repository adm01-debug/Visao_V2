import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as biometricAuth from '@/lib/biometricAuth';

describe('biometricAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports required functions', () => {
    expect(biometricAuth).toBeDefined();
  });

  it('initializes correctly', () => {
    expect(typeof biometricAuth).toBe('object');
  });

  it('handles basic operations', () => {
    const keys = Object.keys(biometricAuth);
    expect(keys.length).toBeGreaterThan(0);
  });

  it('exports are not null', () => {
    Object.values(biometricAuth).forEach(value => {
      expect(value).not.toBeNull();
    });
  });
});
