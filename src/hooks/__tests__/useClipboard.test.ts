import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useClipboard } from '@/hooks/useClipboard';

describe('useClipboard', () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined), readText: vi.fn().mockResolvedValue('text') } });
  });

  it('copies text to clipboard', async () => {
    const { result } = renderHook(() => useClipboard());
    await act(async () => { await result.current.copy('test'); });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test');
  });

  it('reads from clipboard', async () => {
    const { result } = renderHook(() => useClipboard());
    let text;
    await act(async () => { text = await result.current.paste(); });
    expect(text).toBe('text');
  });

  it('tracks copied state', async () => {
    const { result } = renderHook(() => useClipboard());
    await act(async () => { await result.current.copy('test'); });
    expect(result.current.copied).toBe(true);
  });
});
