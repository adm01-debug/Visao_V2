import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
  },
}));

// Mock Notification API
global.Notification = {
  permission: 'granted',
  requestPermission: vi.fn(() => Promise.resolve('granted')),
} as any;

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', async () => {
    const { useNotifications } = await import('../useNotifications');
    const { result } = renderHook(() => useNotifications());

    expect(result.current.notifications).toBeDefined();
    expect(result.current.unreadCount).toBeDefined();
  });

  it('should have notification functions', async () => {
    const { useNotifications } = await import('../useNotifications');
    const { result } = renderHook(() => useNotifications());

    expect(typeof result.current.sendNotification).toBe('function');
    expect(typeof result.current.markAsRead).toBe('function');
    expect(typeof result.current.markAllAsRead).toBe('function');
  });

  it('should have clear function', async () => {
    const { useNotifications } = await import('../useNotifications');
    const { result } = renderHook(() => useNotifications());

    expect(typeof result.current.clearNotifications).toBe('function');
  });

  it('should track unread count', async () => {
    const { useNotifications } = await import('../useNotifications');
    const { result } = renderHook(() => useNotifications());

    expect(typeof result.current.unreadCount).toBe('number');
  });
});
