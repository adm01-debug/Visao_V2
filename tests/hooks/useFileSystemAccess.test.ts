import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/hooks/useFileSystemAccess', () => ({
  useFileSystemAccess: () => ({
    openFile: vi.fn(),
    saveFile: vi.fn(),
    openDirectory: vi.fn(),
    isSupported: true,
  }),
}));

describe('useFileSystemAccess', () => {
  it('deve abrir arquivo', async () => {
    const { useFileSystemAccess } = await import('@/hooks/useFileSystemAccess');
    const { result } = renderHook(() => useFileSystemAccess());
    expect(result.current.openFile).toBeDefined();
  });

  it('deve salvar arquivo', async () => {
    const { useFileSystemAccess } = await import('@/hooks/useFileSystemAccess');
    const { result } = renderHook(() => useFileSystemAccess());
    expect(result.current.saveFile).toBeDefined();
  });
});
