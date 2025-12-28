import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useWebWorker } from '@/hooks/useWebWorker';

describe('useWebWorker', () => {
  beforeEach(() => {
    global.Worker = vi.fn().mockImplementation(() => ({
      postMessage: vi.fn(),
      terminate: vi.fn(),
      onmessage: null,
    })) as any;
  });

  it('deve criar worker', () => {
    const { result } = renderHook(() => useWebWorker('/worker.js'));
    expect(result.current.isRunning).toBeDefined();
  });

  it('deve postar mensagem', () => {
    const { result } = renderHook(() => useWebWorker('/worker.js'));
    act(() => { result.current.postMessage({ type: 'TEST' }); });
  });

  it('deve terminar worker', () => {
    const { result } = renderHook(() => useWebWorker('/worker.js'));
    act(() => { result.current.terminate(); });
  });
});
