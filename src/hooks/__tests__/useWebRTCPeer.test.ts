import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useWebRTCPeer } from '@/hooks/useWebRTCPeer';

describe('useWebRTCPeer', () => {
  beforeEach(() => {
    global.RTCPeerConnection = vi.fn().mockImplementation(() => ({
      createOffer: vi.fn().mockResolvedValue({}),
      createAnswer: vi.fn().mockResolvedValue({}),
      setLocalDescription: vi.fn(),
      setRemoteDescription: vi.fn(),
      close: vi.fn(),
    })) as any;
  });

  it('deve criar conexão', () => {
    const { result } = renderHook(() => useWebRTCPeer());
    expect(result.current.connectionState).toBeDefined();
  });

  it('deve criar oferta', async () => {
    const { result } = renderHook(() => useWebRTCPeer());
    await act(async () => { await result.current.createOffer(); });
  });
});
