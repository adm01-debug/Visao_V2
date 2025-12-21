import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(),
      })),
    })),
    removeChannel: vi.fn(),
  },
}));

describe('useBlacklistAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', async () => {
    const { useBlacklistAlerts } = await import('../useBlacklistAlerts');
    const { result } = renderHook(() => useBlacklistAlerts());

    expect(result.current.alerts).toBeDefined();
    expect(result.current.loading).toBeDefined();
  });

  it('should have dismiss function', async () => {
    const { useBlacklistAlerts } = await import('../useBlacklistAlerts');
    const { result } = renderHook(() => useBlacklistAlerts());

    expect(typeof result.current.dismissAlert).toBe('function');
  });

  it('should have acknowledge function', async () => {
    const { useBlacklistAlerts } = await import('../useBlacklistAlerts');
    const { result } = renderHook(() => useBlacklistAlerts());

    expect(typeof result.current.acknowledgeAlert).toBe('function');
  });

  it('should track active alerts', async () => {
    const { useBlacklistAlerts } = await import('../useBlacklistAlerts');
    const { result } = renderHook(() => useBlacklistAlerts());

    expect(Array.isArray(result.current.alerts)).toBe(true);
  });

  it('should have clear all function', async () => {
    const { useBlacklistAlerts } = await import('../useBlacklistAlerts');
    const { result } = renderHook(() => useBlacklistAlerts());

    expect(typeof result.current.clearAll).toBe('function');
  });
});
