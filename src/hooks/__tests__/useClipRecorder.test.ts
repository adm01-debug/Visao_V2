import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      insert: vi.fn(() => Promise.resolve({ data: { id: 'test-clip' }, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'clips/test.webm' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'http://test.com/clip.webm' } })),
        remove: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    },
  },
}));

// Mock MediaRecorder
global.MediaRecorder = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  ondataavailable: null,
  onstop: null,
  state: 'inactive',
})) as any;

describe('useClipRecorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', async () => {
    const { useClipRecorder } = await import('../useClipRecorder');
    const { result } = renderHook(() => useClipRecorder());

    expect(result.current.isRecording).toBe(false);
    expect(result.current.clips).toBeDefined();
    expect(result.current.currentClip).toBeNull();
  });

  it('should have recording control functions', async () => {
    const { useClipRecorder } = await import('../useClipRecorder');
    const { result } = renderHook(() => useClipRecorder());

    expect(typeof result.current.startRecording).toBe('function');
    expect(typeof result.current.stopRecording).toBe('function');
    expect(typeof result.current.pauseRecording).toBe('function');
    expect(typeof result.current.resumeRecording).toBe('function');
  });

  it('should have clip management functions', async () => {
    const { useClipRecorder } = await import('../useClipRecorder');
    const { result } = renderHook(() => useClipRecorder());

    expect(typeof result.current.deleteClip).toBe('function');
    expect(typeof result.current.downloadClip).toBe('function');
  });

  it('should track recording duration', async () => {
    const { useClipRecorder } = await import('../useClipRecorder');
    const { result } = renderHook(() => useClipRecorder());

    expect(result.current.duration).toBeDefined();
    expect(typeof result.current.duration).toBe('number');
  });
});
