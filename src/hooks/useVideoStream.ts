/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useVideoStream (Refactored)
 *
 * Gerencia conexão e reprodução de streams de vídeo.
 * Suporta HLS (via hls.js), WebRTC e fallback para vídeo nativo.
 */

import { useRef, useCallback, useEffect } from 'react';
import {
  StreamConfig,
  StreamState,
  StreamQuality,
  StreamEvents,
  defaultStreamConfig,
} from '@/types/streaming';
import { useStreamState, initialStats } from './video-stream/useStreamState';
import { useHLSConnection } from './video-stream/useHLSConnection';
import { useStreamControls } from './video-stream/useStreamControls';
import { useStreamStats } from './video-stream/useStreamStats';

// ============================================
// TIPOS DO HOOK
// ============================================

interface UseVideoStreamOptions extends Partial<StreamConfig>, StreamEvents {
  url: string;
  autoPlay?: boolean;
  externalVideoRef?: React.RefObject<HTMLVideoElement>;
}

interface UseVideoStreamReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  state: StreamState;
  connect: () => Promise<void>;
  disconnect: () => void;
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => Promise<void>;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  setQuality: (quality: StreamQuality) => void;
  takeSnapshot: () => string | null;
  toggleFullscreen: () => Promise<void>;
  reconnect: () => Promise<void>;
  getCurrentFrame: () => ImageData | null;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useVideoStream(options: UseVideoStreamOptions): UseVideoStreamReturn {
  const {
    url,
    protocol = 'hls',
    reconnection = defaultStreamConfig.reconnection,
    bufferLength = defaultStreamConfig.bufferLength,
    autoPlay = true,
    externalVideoRef,
    onConnect,
    onDisconnect,
    onPlay,
    onPause,
    onError,
    onStatsUpdate,
    onQualityChange,
    onSnapshot,
    onFrame,
  } = options;

  // Refs
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef || internalVideoRef;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionStartRef = useRef<number>(0);
  const sharedHlsRef = useRef<any>(null);

  // State management
  const { state, updateState, setStatus, setError, clearError, resetState } =
    useStreamState(onError);

  // Controls (play, pause, snapshot, etc.)
  const controlsStub = {
    play: async () => {
      const video = videoRef.current;
      if (!video) return;
      try {
        await video.play();
        updateState({ status: 'playing', isPlaying: true });
        onPlay?.();
      } catch {
        updateState({ isPlaying: false });
      }
    },
    pause: () => {
      const video = videoRef.current;
      if (!video) return;
      video.pause();
      updateState({ status: 'paused', isPlaying: false });
      onPause?.();
    },
  };

  // Stats
  const { updateStats, statsIntervalRef } = useStreamStats({
    videoRef: videoRef as React.RefObject<HTMLVideoElement>,
    hlsRef: sharedHlsRef,
    connectionStartRef,
    reconnectAttempts: state.stats.reconnectAttempts,
    isPlaying: state.status === 'playing',
    updateState: updateState as (u: Record<string, unknown>) => void,
    onStatsUpdate,
  });
  // Indirection to break the connect <-> handleReconnect cycle.
  const connectRef = useRef<(() => Promise<void>) | undefined>(undefined);

  // Reconnection handler
  const handleReconnect = useCallback(async () => {
    if (!reconnection?.enabled) return;
    const attempts = state.stats.reconnectAttempts + 1;
    if (attempts > (reconnection.maxAttempts || 5)) {
      setError('TIMEOUT', `Falha após ${attempts} tentativas`, false);
      return;
    }
    setStatus('reconnecting');
    updateState({ stats: { ...state.stats, reconnectAttempts: attempts } });
    const delay =
      reconnection.delayMs! * Math.pow(reconnection.backoffMultiplier || 1.5, attempts - 1);
    reconnectTimeoutRef.current = setTimeout(() => {
      connectRef.current?.();
    }, delay);
  }, [reconnection, state.stats, setStatus, setError, updateState]);

  // HLS connection
  const { hlsRef, connectHLS, destroyHLS } = useHLSConnection({
    url,
    videoRef: videoRef as React.RefObject<HTMLVideoElement>,
    bufferLength,
    reconnection,
    autoPlay,
    setStatus: setStatus as (s: string) => void,
    setError: setError as (c: string, d?: string, r?: boolean) => void,
    clearError,
    updateState: updateState as (u: Record<string, unknown>) => void,
    updateStats,
    play: controlsStub.play,
    onQualityChange,
    onReconnect: handleReconnect,
    connectionStartRef,
    externalHlsRef: sharedHlsRef,
  });

  // Stream controls (uses hlsRef from HLS connection)
  const controls = useStreamControls({
    videoRef: videoRef as React.RefObject<HTMLVideoElement>,
    hlsRef,
    updateState: updateState as (u: Record<string, unknown>) => void,
    onPlay,
    onPause,
    onSnapshot,
    onFrame,
    onQualityChange,
  });

  // Native connection (MJPEG, MP4)
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- intentional manual memoization for stream connection
  const connectNative = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      setError('UNKNOWN', 'Elemento de vídeo não encontrado');
      return;
    }
    setStatus('connecting');
    connectionStartRef.current = Date.now();
    clearError();
    video.src = url;
    video.onloadeddata = () => {
      setStatus('connected');
      updateState({
        stats: {
          ...state.stats,
          resolution: { width: video.videoWidth, height: video.videoHeight },
        },
      });
      if (autoPlay) controls.play();
    };
    video.onerror = () => {
      setError('NETWORK_ERROR', video.error?.message);
    };
  }, [
    url,
    videoRef,
    autoPlay,
    setStatus,
    setError,
    clearError,
    updateState,
    state.stats,
    controls,
  ]);

  // Connect
  const connect = useCallback(async () => {
    switch (protocol) {
      case 'hls':
        await connectHLS();
        break;
      case 'mjpeg':
      default:
        await connectNative();
        break;
    }
    onConnect?.();
  }, [protocol, connectHLS, connectNative, onConnect]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Disconnect
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- intentional manual memoization for stream teardown
  const disconnect = useCallback(() => {
    destroyHLS();
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.src = '';
      video.load();
    }
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    resetState();
    onDisconnect?.();
  }, [videoRef, destroyHLS, resetState, onDisconnect, statsIntervalRef]);

  // Reconnect
  const reconnect = useCallback(async () => {
    disconnect();
    updateState({ stats: { ...initialStats } });
    await connect();
  }, [disconnect, connect, updateState]);

  // Auto-connect
  useEffect(() => {
    if (url) connect();
    return () => {
      disconnect();
    };
  }, [url]);

  // Fullscreen monitor
  useEffect(() => {
    const handler = () => updateState({ isFullscreen: !!document.fullscreenElement });
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [updateState]);

  return {
    videoRef,
    state,
    connect,
    disconnect,
    play: controls.play,
    pause: controls.pause,
    togglePlay: async () => controls.togglePlay(state.isPlaying),
    toggleMute: controls.toggleMute,
    setVolume: controls.setVolume,
    setQuality: controls.setQuality,
    takeSnapshot: controls.takeSnapshot,
    toggleFullscreen: controls.toggleFullscreen,
    reconnect,
    getCurrentFrame: controls.getCurrentFrame,
  };
}

export default useVideoStream;
