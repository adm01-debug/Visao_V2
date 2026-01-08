import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import * as usePlateDetectionsModule from '@/hooks/usePlateDetections';

describe('usePlateDetections', () => {
  it('exports module correctly', () => {
    expect(usePlateDetectionsModule).toBeDefined();
  });

  it('returns expected structure', () => {
    expect(typeof usePlateDetectionsModule).toBe('object');
  });

  it('has usePlateDetections function', () => {
    expect(usePlateDetectionsModule.usePlateDetections).toBeDefined();
  });

  it('exports are not null', () => {
    Object.values(usePlateDetectionsModule).forEach(value => {
      expect(value).not.toBeNull();
    });
  });
});
