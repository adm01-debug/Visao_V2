import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

vi.mock('@/config/features', () => ({
  features: { newFeature: true, disabledFeature: false },
}));

describe('useFeatureFlag', () => {
  it('returns true for enabled feature', () => {
    const { result } = renderHook(() => useFeatureFlag('newFeature'));
    expect(result.current).toBe(true);
  });

  it('returns false for disabled feature', () => {
    const { result } = renderHook(() => useFeatureFlag('disabledFeature'));
    expect(result.current).toBe(false);
  });

  it('returns false for unknown feature', () => {
    const { result } = renderHook(() => useFeatureFlag('unknownFeature'));
    expect(result.current).toBe(false);
  });
});
