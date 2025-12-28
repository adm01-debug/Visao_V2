import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useFileSystemAccess } from '@/hooks/useFileSystemAccess';

describe('useFileSystemAccess', () => {
  it('deve verificar suporte', () => {
    const { result } = renderHook(() => useFileSystemAccess());
    expect(result.current.isSupported).toBeDefined();
  });

  it('deve abrir arquivo', async () => {
    (window as any).showOpenFilePicker = vi.fn().mockResolvedValue([{
      getFile: () => Promise.resolve(new File(['test'], 'test.txt')),
    }]);
    const { result } = renderHook(() => useFileSystemAccess());
    await act(async () => { await result.current.openFile(); });
  });

  it('deve salvar arquivo', async () => {
    (window as any).showSaveFilePicker = vi.fn().mockResolvedValue({
      createWritable: () => Promise.resolve({ write: vi.fn(), close: vi.fn() }),
    });
    const { result } = renderHook(() => useFileSystemAccess());
    await act(async () => { await result.current.saveFile('content', 'test.txt'); });
  });
});
