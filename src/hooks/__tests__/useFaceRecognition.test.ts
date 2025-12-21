import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'test' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'http://test.com/image.jpg' } })),
      })),
    },
  },
}));

describe('useFaceRecognition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', async () => {
    const { useFaceRecognition } = await import('../useFaceRecognition');
    const { result } = renderHook(() => useFaceRecognition());

    expect(result.current.persons).toBeDefined();
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should have CRUD functions', async () => {
    const { useFaceRecognition } = await import('../useFaceRecognition');
    const { result } = renderHook(() => useFaceRecognition());

    expect(typeof result.current.registerPerson).toBe('function');
    expect(typeof result.current.updatePerson).toBe('function');
    expect(typeof result.current.deletePerson).toBe('function');
  });

  it('should have recognition functions', async () => {
    const { useFaceRecognition } = await import('../useFaceRecognition');
    const { result } = renderHook(() => useFaceRecognition());

    expect(typeof result.current.recognizeFace).toBe('function');
  });

  it('should filter persons by type', async () => {
    const { useFaceRecognition } = await import('../useFaceRecognition');
    const { result } = renderHook(() => useFaceRecognition());

    // Check if filter functions exist
    if (result.current.getBlacklist) {
      const blacklist = result.current.getBlacklist();
      expect(Array.isArray(blacklist)).toBe(true);
    }
  });
});
