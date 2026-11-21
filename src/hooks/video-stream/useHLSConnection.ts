/**
 * VISÃO - HLS Connection Handler (lazy-loaded hls.js)
 */
import { useCallback, useRef } from 'react';
import type HlsType from 'hls.js';
import { StreamQuality, StreamConfig } from '@/types/streaming';
import { getHls } from '@/lib/lazyHls';

interface UseHLSConnectionOptions {
  url: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  bufferLength?: number;
  reconnection?: StreamConfig['reconnection'];
  autoPlay?: boolean;
  setStatus: (status: string) => void;
  setError: (code: string, details?: string, recoverable?: boolean) => void;
  clearError: () => void;
  updateState: (updates: Record<string, unknown>) => void;
  updateStats: () => void;
  play: () => Promise<void>;
  onQualityChange?: (quality: StreamQuality) => void;
  onReconnect: () => void;
  connectionStartRef: React.MutableRefObject<number>;
  /** Ref compartilhado para o stats/controles consumirem a mesma instancia HLS */
  externalHlsRef?: React.MutableRefObject<HlsType | null>;
}

export function useHLSConnection(options: UseHLSConnectionOptions) {
  const {
    url,
    videoRef,
    bufferLength = 30,
    reconnection,
    autoPlay = true,
    setStatus,
    setError,
    clearError,
    updateState,
    updateStats,
    play,
    onQualityChange,
    onReconnect,
    connectionStartRef,
    externalHlsRef,
  } = options;

  const internalHlsRef = useRef<HlsType | null>(null);
  const hlsRef = externalHlsRef ?? internalHlsRef;

  const connectHLS = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      setError('UNKNOWN', 'Elemento de vídeo não encontrado');
      return;
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setStatus('connecting');
    connectionStartRef.current = Date.now();
    clearError();

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      setStatus('connected');
      if (autoPlay) await play();
      return;
    }

    // Dynamically load hls.js
    const Hls = await getHls();

    if (!Hls.isSupported()) {
      setError('FORMAT_ERROR', 'Navegador não suporta HLS');
      return;
    }

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: bufferLength,
      maxBufferLength: bufferLength * 2,
      maxMaxBufferLength: bufferLength * 4,
      manifestLoadingMaxRetry: reconnection?.maxAttempts || 3,
      manifestLoadingRetryDelay: reconnection?.delayMs || 1000,
      levelLoadingMaxRetry: reconnection?.maxAttempts || 3,
      fragLoadingMaxRetry: reconnection?.maxAttempts || 3,
    });

    hlsRef.current = hls;

    hls.on(Hls.Events.MEDIA_ATTACHED, () => {});

    hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
      const qualities: StreamQuality[] = ['auto'];
      data.levels.forEach((level) => {
        if (level.height >= 1080) qualities.push('1080p');
        else if (level.height >= 720) qualities.push('720p');
        else if (level.height >= 480) qualities.push('480p');
        else if (level.height >= 360) qualities.push('360p');
      });
      updateState({ status: 'connected', availableQualities: [...new Set(qualities)] });
      if (autoPlay) play();
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
      const level = hls.levels[data.level];
      if (level) {
        let quality: StreamQuality = 'auto';
        if (level.height >= 1080) quality = '1080p';
        else if (level.height >= 720) quality = '720p';
        else if (level.height >= 480) quality = '480p';
        else if (level.height >= 360) quality = '360p';
        updateState({ currentQuality: quality });
        onQualityChange?.(quality);
      }
    });

    hls.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            setError('NETWORK_ERROR', data.details);
            if (reconnection?.enabled) onReconnect();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            setError('FORMAT_ERROR', data.details);
            hls.recoverMediaError();
            break;
          default:
            setError('PROTOCOL_ERROR', data.details, false);
            break;
        }
      }
    });

    hls.on(Hls.Events.FRAG_BUFFERED, () => {
      updateStats();
    });

    hls.loadSource(url);
    hls.attachMedia(video);
  }, [
    url,
    videoRef,
    autoPlay,
    bufferLength,
    reconnection,
    setStatus,
    setError,
    clearError,
    updateState,
    onQualityChange,
    updateStats,
    play,
    onReconnect,
    connectionStartRef,
  ]);

  const destroyHLS = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  return { hlsRef, connectHLS, destroyHLS };
}
