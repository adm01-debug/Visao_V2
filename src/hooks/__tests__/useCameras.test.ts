import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useCameras } from '@/hooks/useCameras';

vi.mock('@/services/cameraService', () => ({
  getCameras: vi.fn().mockResolvedValue([{ id: '1', name: 'Camera 1' }]),
  addCamera: vi.fn().mockResolvedValue({ id: '2', name: 'New Camera' }),
}));

describe('useCameras', () => {
  it('loads cameras', async () => {
    const { result } = renderHook(() => useCameras());
    await waitFor(() => expect(result.current.cameras).toHaveLength(1));
  });

  it('provides add camera function', () => {
    const { result } = renderHook(() => useCameras());
    expect(typeof result.current.addCamera).toBe('function');
  });

  it('tracks loading state', () => {
    const { result } = renderHook(() => useCameras());
    expect(result.current.loading).toBeDefined();
  });

  it('provides refresh function', () => {
    const { result } = renderHook(() => useCameras());
    expect(typeof result.current.refresh).toBe('function');
  });
});
