import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('should initialize with default settings', async () => {
    const { useSettings } = await import('../useSettings');
    const { result } = renderHook(() => useSettings());

    expect(result.current.settings).toBeDefined();
    expect(result.current.loading).toBeDefined();
  });

  it('should have update functions', async () => {
    const { useSettings } = await import('../useSettings');
    const { result } = renderHook(() => useSettings());

    expect(typeof result.current.updateSettings).toBe('function');
    expect(typeof result.current.resetSettings).toBe('function');
  });

  it('should provide general settings', async () => {
    const { useSettings } = await import('../useSettings');
    const { result } = renderHook(() => useSettings());

    expect(result.current.settings.general).toBeDefined();
  });

  it('should provide notification settings', async () => {
    const { useSettings } = await import('../useSettings');
    const { result } = renderHook(() => useSettings());

    expect(result.current.settings.notifications).toBeDefined();
  });

  it('should provide analysis settings', async () => {
    const { useSettings } = await import('../useSettings');
    const { result } = renderHook(() => useSettings());

    expect(result.current.settings.analysis).toBeDefined();
  });
});
