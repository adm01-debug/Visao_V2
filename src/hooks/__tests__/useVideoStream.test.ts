/**
 * VISÃO - Testes do useVideoStream
 * Testes para streaming de vídeo HLS/WebRTC
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock do Hls.js
vi.mock('hls.js', () => ({
  default: vi.fn().mockImplementation(() => ({
    loadSource: vi.fn(),
    attachMedia: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    isSupported: vi.fn().mockReturnValue(true),
  })),
  isSupported: vi.fn().mockReturnValue(true),
}));

// Mock do HTMLVideoElement
const mockVideoElement = {
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  load: vi.fn(),
  muted: false,
  volume: 1,
  currentTime: 0,
  duration: 100,
  paused: true,
  readyState: 4,
  videoWidth: 1920,
  videoHeight: 1080,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  requestFullscreen: vi.fn().mockResolvedValue(undefined),
};

describe('useVideoStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default state', async () => {
    const { useVideoStream } = await import('@/hooks/useVideoStream');
    
    const { result } = renderHook(() => useVideoStream({
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      protocol: 'hls',
    }));

    expect(result.current.state).toBeDefined();
    expect(result.current.state.isPlaying).toBe(false);
    expect(result.current.state.isMuted).toBe(true);
  });

  it('should have control functions', async () => {
    const { useVideoStream } = await import('@/hooks/useVideoStream');
    
    const { result } = renderHook(() => useVideoStream({
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      protocol: 'hls',
    }));

    expect(typeof result.current.play).toBe('function');
    expect(typeof result.current.pause).toBe('function');
    expect(typeof result.current.togglePlay).toBe('function');
    expect(typeof result.current.toggleMute).toBe('function');
  });

  it('should have snapshot function', async () => {
    const { useVideoStream } = await import('@/hooks/useVideoStream');
    
    const { result } = renderHook(() => useVideoStream({
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      protocol: 'hls',
    }));

    expect(typeof result.current.takeSnapshot).toBe('function');
  });

  it('should have fullscreen function', async () => {
    const { useVideoStream } = await import('@/hooks/useVideoStream');
    
    const { result } = renderHook(() => useVideoStream({
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      protocol: 'hls',
    }));

    expect(typeof result.current.toggleFullscreen).toBe('function');
  });

  it('should have reconnect function', async () => {
    const { useVideoStream } = await import('@/hooks/useVideoStream');
    
    const { result } = renderHook(() => useVideoStream({
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      protocol: 'hls',
    }));

    expect(typeof result.current.reconnect).toBe('function');
  });

  it('should have videoRef', async () => {
    const { useVideoStream } = await import('@/hooks/useVideoStream');
    
    const { result } = renderHook(() => useVideoStream({
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      protocol: 'hls',
    }));

    expect(result.current.videoRef).toBeDefined();
  });

  it('should accept autoPlay option', async () => {
    const { useVideoStream } = await import('@/hooks/useVideoStream');
    
    const { result } = renderHook(() => useVideoStream({
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      protocol: 'hls',
      autoPlay: true,
    }));

    expect(result.current).toBeDefined();
  });

  it('should accept muted option', async () => {
    const { useVideoStream } = await import('@/hooks/useVideoStream');
    
    const { result } = renderHook(() => useVideoStream({
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      protocol: 'hls',
      muted: false,
    }));

    expect(result.current).toBeDefined();
  });
});

describe('Stream Protocols', () => {
  it('should support HLS protocol', async () => {
    const { useVideoStream } = await import('@/hooks/useVideoStream');
    
    const { result } = renderHook(() => useVideoStream({
      url: 'https://example.com/stream.m3u8',
      protocol: 'hls',
    }));

    expect(result.current).toBeDefined();
  });

  it('should support WebRTC protocol', async () => {
    const { useVideoStream } = await import('@/hooks/useVideoStream');
    
    const { result } = renderHook(() => useVideoStream({
      url: 'https://example.com/stream/whep',
      protocol: 'webrtc',
    }));

    expect(result.current).toBeDefined();
  });

  it('should support native protocol', async () => {
    const { useVideoStream } = await import('@/hooks/useVideoStream');
    
    const { result } = renderHook(() => useVideoStream({
      url: 'https://example.com/stream.mp4',
      protocol: 'native',
    }));

    expect(result.current).toBeDefined();
  });
});

describe('Stream State', () => {
  it('should track loading state', async () => {
    const { useVideoStream } = await import('@/hooks/useVideoStream');
    
    const { result } = renderHook(() => useVideoStream({
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      protocol: 'hls',
    }));

    expect(typeof result.current.state.isLoading).toBe('boolean');
  });

  it('should track error state', async () => {
    const { useVideoStream } = await import('@/hooks/useVideoStream');
    
    const { result } = renderHook(() => useVideoStream({
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      protocol: 'hls',
    }));

    expect(result.current.state.error).toBeNull();
  });

  it('should track connection state', async () => {
    const { useVideoStream } = await import('@/hooks/useVideoStream');
    
    const { result } = renderHook(() => useVideoStream({
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      protocol: 'hls',
    }));

    expect(result.current.state.isConnected).toBeDefined();
  });
});
