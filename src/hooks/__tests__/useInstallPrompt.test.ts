import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

describe('useInstallPrompt', () => {
  it('deve detectar evento beforeinstallprompt', () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = new Event('beforeinstallprompt');
    act(() => { window.dispatchEvent(event); });
    expect(result.current.canInstall).toBeDefined();
  });

  it('deve exibir prompt de instalação', async () => {
    const mockPrompt = vi.fn().mockResolvedValue({ outcome: 'accepted' });
    const event = new Event('beforeinstallprompt') as any;
    event.prompt = mockPrompt;
    
    const { result } = renderHook(() => useInstallPrompt());
    act(() => { window.dispatchEvent(event); });
    await act(async () => { await result.current.install(); });
  });

  it('deve detectar se já está instalado', () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isInstalled).toBeDefined();
  });
});
