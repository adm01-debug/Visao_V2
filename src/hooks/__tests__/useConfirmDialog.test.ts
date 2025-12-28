import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

describe('useConfirmDialog', () => {
  it('opens dialog', () => {
    const { result } = renderHook(() => useConfirmDialog());
    act(() => { result.current.open({ title: 'Confirm?', onConfirm: vi.fn() }); });
    expect(result.current.isOpen).toBe(true);
  });

  it('closes dialog', () => {
    const { result } = renderHook(() => useConfirmDialog());
    act(() => { result.current.open({ title: 'Confirm?', onConfirm: vi.fn() }); });
    act(() => { result.current.close(); });
    expect(result.current.isOpen).toBe(false);
  });

  it('calls onConfirm', () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() => useConfirmDialog());
    act(() => { result.current.open({ title: 'Confirm?', onConfirm }); });
    act(() => { result.current.confirm(); });
    expect(onConfirm).toHaveBeenCalled();
  });
});
