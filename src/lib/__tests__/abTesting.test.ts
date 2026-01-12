import { describe, it, expect, beforeEach } from 'vitest';
import { abTesting } from '../abTesting';

describe('ABTestingService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should register experiments', () => {
    abTesting.registerExperiment({
      id: 'test-experiment',
      variants: ['control', 'treatment'],
    });

    const variant = abTesting.getVariant('test-experiment');
    expect(['control', 'treatment']).toContain(variant);
  });

  it('should return consistent variant for same user', () => {
    abTesting.setUser('user-123');
    abTesting.registerExperiment({
      id: 'consistent-test',
      variants: ['a', 'b'],
    });

    const variant1 = abTesting.getVariant('consistent-test');
    const variant2 = abTesting.getVariant('consistent-test');
    
    expect(variant1).toBe(variant2);
  });

  it('should return null for unregistered experiments', () => {
    const variant = abTesting.getVariant('non-existent');
    expect(variant).toBeNull();
  });
});
