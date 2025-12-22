import { retry, withRetry } from "@/lib/retry";
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useVideoStream
 * 
 * Gerencia conexão e reprodução de streams de vídeo.
 * Suporta HLS (via hls.js), WebRTC e fallback para vídeo nativo.
 * 
 * @example
 * const { 
 *   videoRef, 
 *   state, 
 *   play, 
 *   pause, 
 *   takeSnapshot 
 * } = useVideoStream({
 *   url: 'https://example.com/stream.m3u8',
 *   protocol: 'hls',
 * });
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import Hls from 'hls.js';
import {
  StreamConfig,
  StreamState,
  StreamStatus,
  StreamStats,
  StreamError,
  StreamErrorCode,
  StreamQuality,
  StreamEvents,
  defaultStreamConfig,
  streamErrorMessages,
} from '@/types/streaming';

// ============================================
// TIPOS DO HOOK
// ============================================

interface UseVideoStreamOptions extends Partial<StreamConfig>, StreamEvents {
  /** URL do stream (obrigatório) */
  url: string;
  
  /** Auto-play ao conectar */
  autoPlay?: boolean;
  
  /** Ref externo do vídeo (opcional) */
  externalVideoRef?: React.RefObject<HTMLVideoElement>;
}

interface UseVideoStreamReturn {
  /** Ref para o elemento <video> */
  videoRef: React.RefObject<HTMLVideoElement>;
  
  /** Estado atual do stream */
  state: StreamState;
  
  /** Conectar ao stream */
  connect: () => Promise<void>;
  
  /** Desconectar do stream */
  disconnect: () => void;
  
  /** Reproduzir */
  play: () => Promise<void>;
  
  /** Pausar */
  pause: () => void;
  
  /** Toggle play/pause */
  togglePlay: () => Promise<void>;
  
  /** Toggle mute */
  toggleMute: () => void;
  
  /** Definir volume (0-1) */
  setVolume: (volume: number) => void;
  
  /** Mudar qualidade */
  setQuality: (quality: StreamQuality) => void;
  
  /** Capturar snapshot */
  takeSnapshot: () => string | null;
  
  /** Entrar/sair fullscreen */
  toggleFullscreen: () => Promise<void>;
  
  /** Forçar reconexão */
  reconnect: () => Promise<void>;
  
  /** Obter frame atual para análise */
  getCurrentFrame: () => ImageData | null;
}

// ============================================
// ESTADO INICIAL
// ============================================

const initialStats: StreamStats = {
  bitrate: 0,
  fps: 0,
  resolution: { width: 0, height: 0 },
  latency: 0,
  droppedFrames: 0,
  buffered: 0,
  connectionTime: 0,
  reconnectAttempts: 0,
};

const initialState: StreamState = {
  status: 'disconnected',
  isPlaying: false,
  isMuted: true,
  volume: 1,
  currentQuality: 'auto',
  availableQualities: ['auto'],
  stats: initialStats,
  error: null,
  lastFrameTime: null,
  isFullscreen: false,
  showControls: true,
};

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useVideoStream(options: UseVideoStreamOptions): UseVideoStreamReturn {
  const {
    url,
    protocol = 'hls',
    preferredQuality = 'auto',
    reconnection = defaultStreamConfig.reconnection,
    bufferLength = defaultStreamConfig.bufferLength,
    enableAudio = false,
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
    credentials,
  } = options;

  // Refs
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef || internalVideoRef;
  const hlsRef = useRef<Hls | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionStartRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // State
  const [state, setState] = useState<StreamState>(initialState);

  // ============================================
  // HELPERS
  // ============================================

  const updateState = useCallback((updates: Partial<StreamState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const setStatus = useCallback((status: StreamStatus) => {
    updateState({ status });
  }, [updateState]);

  const setError = useCallback((code: StreamErrorCode, details?: string, recoverable = true) => {
    const error: StreamError = {
      code,
      message: streamErrorMessages[code],
      details,
      timestamp: new Date(),
      recoverable,
    };
    updateState({ status: 'error', error });
    onError?.(error);
  }, [updateState, onError]);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // ============================================
  // ESTATÍSTICAS
  // ============================================

  const updateStats = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const stats: StreamStats = {
      bitrate: 0,
      fps: 0,
      resolution: { width: video.videoWidth, height: video.videoHeight },
      latency: 0,
      droppedFrames: 0,
      buffered: 0,
      connectionTime: connectionStartRef.current 
        ? Date.now() - connectionStartRef.current 
        : 0,
      reconnectAttempts: state.stats.reconnectAttempts,
    };

    // Calcular buffer
    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      stats.buffered = bufferedEnd - video.currentTime;
    }

    // Estatísticas específicas do HLS
    if (hlsRef.current) {
      const hls = hlsRef.current;
      if (hls.bandwidthEstimate) {
        stats.bitrate = Math.round(hls.bandwidthEstimate / 1000);
      }
      if (hls.latency !== undefined) {
        stats.latency = Math.round(hls.latency * 1000);
      }
    }

    // Frames perdidos (API experimental)
    if ('getVideoPlaybackQuality' in video) {
      const quality = (video as unknown).getVideoPlaybackQuality();
      stats.droppedFrames = quality?.droppedVideoFrames || 0;
      if (quality?.totalVideoFrames && connectionStartRef.current) {
        const elapsed = (Date.now() - connectionStartRef.current) / 1000;
        stats.fps = Math.round(quality.totalVideoFrames / elapsed);
      }
    }

    updateState({ stats });
    onStatsUpdate?.(stats);
  }, [videoRef, state.stats.reconnectAttempts, updateState, onStatsUpdate]);

  // ============================================
  // CONEXÃO HLS
  // ============================================

  const connectHLS = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      setError('UNKNOWN', 'Elemento de vídeo não encontrado');
      return;
    }

    // Limpar conexão anterior
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setStatus('connecting');
    connectionStartRef.current = Date.now();
    clearError();

    // Verificar suporte nativo a HLS (Safari)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      setStatus('connected');
      if (autoPlay) {
        await play();
      }
      return;
    }

    // Usar hls.js para outros navegadores
    if (!Hls.isSupported()) {
      setError('FORMAT_ERROR', 'Navegador não suporta HLS');
      return;
    }

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: bufferLength,
      maxBufferLength: bufferLength! * 2,
      maxMaxBufferLength: bufferLength! * 4,
      // Configurações de reconexão
      manifestLoadingMaxRetry: reconnection?.maxAttempts || 3,
      manifestLoadingRetryDelay: reconnection?.delayMs || 1000,
      levelLoadingMaxRetry: reconnection?.maxAttempts || 3,
      fragLoadingMaxRetry: reconnection?.maxAttempts || 3,
    });

    hlsRef.current = hls;

    // Eventos HLS
    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
    });

    hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
      
      // Extrair qualidades disponíveis
      const qualities: StreamQuality[] = ['auto'];
      data.levels.forEach(level => {
        if (level.height >= 1080) qualities.push('1080p');
        else if (level.height >= 720) qualities.push('720p');
        else if (level.height >= 480) qualities.push('480p');
        else if (level.height >= 360) qualities.push('360p');
      });
      
      updateState({ 
        status: 'connected',
        availableQualities: [...new Set(qualities)],
      });

      if (autoPlay) {
        play();
      }
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
      console.error('[HLS] Error:', data.type, data.details);
      
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            setError('NETWORK_ERROR', data.details);
            if (reconnection?.enabled) {
              handleReconnect();
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            setError('FORMAT_ERROR', data.details);
            // Tentar recuperar de erro de mídia
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

    // Carregar stream
    hls.loadSource(url);
    hls.attachMedia(video);

  }, [url, videoRef, autoPlay, bufferLength, reconnection, setStatus, setError, clearError, updateState, onQualityChange, updateStats]);

  // ============================================
  // CONEXÃO NATIVA (MJPEG, MP4, etc)
  // ============================================

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
      if (autoPlay) {
        play();
      }
    };

    video.onerror = () => {
      setError('NETWORK_ERROR', video.error?.message);
    };

  }, [url, videoRef, autoPlay, setStatus, setError, clearError, updateState, state.stats]);

  // ============================================
  // RECONEXÃO
  // ============================================

  const handleReconnect = useCallback(async () => {
    if (!reconnection?.enabled) return;
    
    const attempts = state.stats.reconnectAttempts + 1;
    
    if (attempts > (reconnection.maxAttempts || 5)) {
      setError('TIMEOUT', `Falha após ${attempts} tentativas`, false);
      return;
    }

    setStatus('reconnecting');
    updateState({ 
      stats: { ...state.stats, reconnectAttempts: attempts } 
    });

    const delay = reconnection.delayMs! * Math.pow(reconnection.backoffMultiplier || 1.5, attempts - 1);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);

  }, [reconnection, state.stats, setStatus, setError, updateState]);

  // ============================================
  // API PÚBLICA
  // ============================================

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

  const disconnect = useCallback(() => {
    // Limpar HLS
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Limpar vídeo
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.src = '';
      video.load();
    }

    // Limpar timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }

    setState(initialState);
    onDisconnect?.();
  }, [videoRef, onDisconnect]);

  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      await video.play();
      updateState({ status: 'playing', isPlaying: true });
      onPlay?.();
    } catch (error) {
      console.error('[Stream] Play error:', error);
      // Auto-play bloqueado - comum em navegadores
      updateState({ isPlaying: false });
    }
  }, [videoRef, updateState, onPlay]);

  const pause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    updateState({ status: 'paused', isPlaying: false });
    onPause?.();
  }, [videoRef, updateState, onPause]);

  const togglePlay = useCallback(async () => {
    if (state.isPlaying) {
      pause();
    } else {
      await play();
    }
  }, [state.isPlaying, play, pause]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    updateState({ isMuted: video.muted });
  }, [videoRef, updateState]);

  const setVolume = useCallback((volume: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = Math.max(0, Math.min(1, volume));
    updateState({ volume: video.volume, isMuted: video.volume === 0 });
  }, [videoRef, updateState]);

  const setQuality = useCallback((quality: StreamQuality) => {
    if (!hlsRef.current) return;

    if (quality === 'auto') {
      hlsRef.current.currentLevel = -1; // Auto
    } else {
      const targetHeight = parseInt(quality);
      const levelIndex = hlsRef.current.levels.findIndex(
        level => level.height === targetHeight
      );
      if (levelIndex >= 0) {
        hlsRef.current.currentLevel = levelIndex;
      }
    }

    updateState({ currentQuality: quality });
    onQualityChange?.(quality);
  }, [updateState, onQualityChange]);

  const takeSnapshot = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;

    // Criar canvas se não existir
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    
    onSnapshot?.(dataUrl);
    return dataUrl;
  }, [videoRef, onSnapshot]);

  const getCurrentFrame = useCallback((): ImageData | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    onFrame?.(imageData);
    return imageData;
  }, [videoRef, onFrame]);

  const toggleFullscreen = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        updateState({ isFullscreen: false });
      } else {
        await video.requestFullscreen();
        updateState({ isFullscreen: true });
      }
    } catch (error) {
      console.error('[Stream] Fullscreen error:', error);
    }
  }, [videoRef, updateState]);

  const reconnect = useCallback(async () => {
    disconnect();
    updateState({ stats: { ...initialStats } });
    await connect();
  }, [disconnect, connect, updateState]);

  // ============================================
  // EFEITOS
  // ============================================

  // Conectar automaticamente
  useEffect(() => {
    if (url) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [url]); // Reconectar se URL mudar

  // Atualizar stats periodicamente
  useEffect(() => {
    if (state.status === 'playing') {
      statsIntervalRef.current = setInterval(updateStats, 2000);
    } else {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    }

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, [state.status, updateStats]);

  // Monitorar fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      updateState({ isFullscreen: !!document.fullscreenElement });
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [updateState]);

  // ============================================
  // RETORNO
  // ============================================

  return {
    videoRef,
    state,
    connect,
    disconnect,
    play,
    pause,
    togglePlay,
    toggleMute,
    setVolume,
    setQuality,
    takeSnapshot,
    toggleFullscreen,
    reconnect,
    getCurrentFrame,
  };
}

export default useVideoStream;
