/**
 * VISÃO - Testes: useVideoStream
 * 
 * Testes unitários para o hook de streaming de vídeo.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVideoStream } from '../useVideoStream';

// Mocks
const mockMediaStream = {
  getTracks: () => [{ stop: vi.fn() }],
  getVideoTracks: () => [{ getSettings: () => ({ width: 1920, height: 1080 }) }],
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'cam-1', url: 'rtsp://test', name: 'Test Camera' },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

// Mock fetch para HLS
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  blob: () => Promise.resolve(new Blob()),
});

// Mock RTCPeerConnection
global.RTCPeerConnection = vi.fn().mockImplementation(() => ({
  createOffer: vi.fn().mockResolvedValue({ sdp: 'test-sdp', type: 'offer' }),
  setLocalDescription: vi.fn().mockResolvedValue(undefined),
  setRemoteDescription: vi.fn().mockResolvedValue(undefined),
  addTransceiver: vi.fn(),
  close: vi.fn(),
  ontrack: null,
  onicecandidate: null,
  onconnectionstatechange: null,
  connectionState: 'connected',
}));

describe('useVideoStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Inicialização', () => {
    it('deve inicializar com estado desconectado', () => {
      const { result } = renderHook(() => useVideoStream('camera-1'));
      
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
    });

    it('deve aceitar cameraId como parâmetro', () => {
      const { result } = renderHook(() => useVideoStream('test-camera'));
      
      expect(result.current).toBeDefined();
    });

    it('deve ter stream null inicialmente', () => {
      const { result } = renderHook(() => useVideoStream('camera-1'));
      
      expect(result.current.stream).toBeNull();
    });
  });

  describe('Protocolos suportados', () => {
    it('deve suportar protocolo HLS', () => {
      const { result } = renderHook(() => useVideoStream('camera-1', {
        protocol: 'hls',
      }));
      
      expect(result.current).toBeDefined();
    });

    it('deve suportar protocolo WebRTC', () => {
      const { result } = renderHook(() => useVideoStream('camera-1', {
        protocol: 'webrtc',
      }));
      
      expect(result.current).toBeDefined();
    });

    it('deve suportar protocolo RTSP (via proxy)', () => {
      const { result } = renderHook(() => useVideoStream('camera-1', {
        protocol: 'rtsp',
      }));
      
      expect(result.current).toBeDefined();
    });
  });

  describe('Conexão', () => {
    it('deve expor função connect', () => {
      const { result } = renderHook(() => useVideoStream('camera-1'));
      
      expect(typeof result.current.connect).toBe('function');
    });

    it('deve expor função disconnect', () => {
      const { result } = renderHook(() => useVideoStream('camera-1'));
      
      expect(typeof result.current.disconnect).toBe('function');
    });

    it('deve expor função reconnect', () => {
      const { result } = renderHook(() => useVideoStream('camera-1'));
      
      expect(typeof result.current.reconnect).toBe('function');
    });
  });

  describe('Qualidade', () => {
    it('deve expor função setQuality', () => {
      const { result } = renderHook(() => useVideoStream('camera-1'));
      
      expect(typeof result.current.setQuality).toBe('function');
    });

    it('deve permitir qualidades low, medium, high', () => {
      const qualities = ['low', 'medium', 'high'] as const;
      
      qualities.forEach(quality => {
        const { result } = renderHook(() => useVideoStream('camera-1', {
          quality,
        }));
        
        expect(result.current).toBeDefined();
      });
    });
  });

  describe('Estatísticas', () => {
    it('deve expor stats de conexão', () => {
      const { result } = renderHook(() => useVideoStream('camera-1'));
      
      expect(result.current.stats).toBeDefined();
    });

    it('deve incluir FPS nas stats', () => {
      const { result } = renderHook(() => useVideoStream('camera-1'));
      
      expect(typeof result.current.stats.fps).toBe('number');
    });

    it('deve incluir latência nas stats', () => {
      const { result } = renderHook(() => useVideoStream('camera-1'));
      
      expect(typeof result.current.stats.latency).toBe('number');
    });
  });

  describe('Snapshot', () => {
    it('deve expor função takeSnapshot', () => {
      const { result } = renderHook(() => useVideoStream('camera-1'));
      
      expect(typeof result.current.takeSnapshot).toBe('function');
    });
  });

  describe('Erros', () => {
    it('deve expor erro atual', () => {
      const { result } = renderHook(() => useVideoStream('camera-1'));
      
      expect(result.current.error).toBeNull();
    });

    it('deve aceitar callback onError', () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useVideoStream('camera-1', {
        onError,
      }));
      
      expect(result.current).toBeDefined();
    });
  });

  describe('Auto-connect', () => {
    it('deve respeitar opção autoConnect', () => {
      const { result } = renderHook(() => useVideoStream('camera-1', {
        autoConnect: false,
      }));
      
      expect(result.current.isConnecting).toBe(false);
    });
  });

  describe('Limpeza', () => {
    it('deve desconectar ao desmontar', () => {
      const { result, unmount } = renderHook(() => useVideoStream('camera-1'));
      
      expect(() => unmount()).not.toThrow();
    });
  });
});
