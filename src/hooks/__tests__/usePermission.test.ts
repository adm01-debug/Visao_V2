import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { usePermission } from '@/hooks/usePermission';

describe('usePermission', () => {
  it('deve verificar permissão', async () => {
    navigator.permissions = { query: vi.fn().mockResolvedValue({ state: 'granted' }) } as any;
    const { result } = renderHook(() => usePermission('camera'));
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(result.current.state).toBe('granted');
  });

  it('deve lidar com erro', async () => {
    navigator.permissions = { query: vi.fn().mockRejectedValue(new Error()) } as any;
    const { result } = renderHook(() => usePermission('camera'));
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
  });
});
