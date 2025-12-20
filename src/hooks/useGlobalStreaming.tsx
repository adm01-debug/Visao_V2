/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useGlobalStreaming
 * 
 * Gerencia streaming global em todas as páginas:
 * - Pool de conexões HLS
 * - Priorização de streams visíveis
 * - Reconexão automática
 * - Cache de thumbnails
 * - Métricas de performance
 */

import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import Hls from 'hls.js';
import { supabase } from '@/integrations/supabase/client';

// ============================================
// TIPOS
// ============================================

export type StreamQuality = 'auto' | 'low' | 'medium' | 'high';
export type StreamStatus = 'idle' | 'connecting' | 'connected' | 'playing' | 'paused' | 'error' | 'offline';

export interface StreamConnection {
  cameraId: string;
  hlsInstance: Hls | null;
  videoElement: HTMLVideoElement | null;
  status: StreamStatus;
  quality: StreamQuality;
  bitrate: number;
  latency: number;
  buffered: number;
  lastFrame: string | null;
  errorCount: number;
  lastError: string | null;
  connectedAt: Date | null;
}

export interface CameraStreamConfig {
  id: string;
  name: string;
  hlsUrl: string;
  webrtcUrl?: string;
  priority: number;
  enabled: boolean;
}

export interface GlobalStreamingStats {
  totalConnections: number;
  activeConnections: number;
  totalBitrate: number;
  averageLatency: number;
  errorRate: number;
}

export interface GlobalStreamingConfig {
  maxConcurrentStreams: number;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  bufferLength: number;
  lowLatencyMode: boolean;
  adaptiveBitrate: boolean;
  thumbnailInterval: number;
  priorityBoostVisible: boolean;
}

// ============================================
// CONFIGURAÇÃO PADRÃO
// ============================================

const DEFAULT_CONFIG: GlobalStreamingConfig = {
  maxConcurrentStreams: 8,
  reconnectDelay: 3000,
  maxReconnectAttempts: 5,
  bufferLength: 10,
  lowLatencyMode: true,
  adaptiveBitrate: true,
  thumbnailInterval: 30000,
  priorityBoostVisible: true,
};

// ============================================
// CONTEXT
// ============================================

interface GlobalStreamingContextValue {
  connections: Map<string, StreamConnection>;
  stats: GlobalStreamingStats;
  config: GlobalStreamingConfig;
  
  // Ações
  connect: (cameraId: string, hlsUrl: string, videoElement: HTMLVideoElement) => void;
  disconnect: (cameraId: string) => void;
  disconnectAll: () => void;
  setVisible: (cameraId: string, visible: boolean) => void;
  setQuality: (cameraId: string, quality: StreamQuality) => void;
  getConnection: (cameraId: string) => StreamConnection | undefined;
  getThumbnail: (cameraId: string) => string | null;
  updateConfig: (updates: Partial<GlobalStreamingConfig>) => void;
}

const GlobalStreamingContext = createContext<GlobalStreamingContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

interface GlobalStreamingProviderProps {
  children: React.ReactNode;
  config?: Partial<GlobalStreamingConfig>;
}

export function GlobalStreamingProvider({ 
  children, 
  config: initialConfig 
}: GlobalStreamingProviderProps) {
  const [connections, setConnections] = useState<Map<string, StreamConnection>>(new Map());
  const [config, setConfig] = useState<GlobalStreamingConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });
  
  const visibleCameras = useRef<Set<string>>(new Set());
  const reconnectTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const thumbnailIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Calcular estatísticas
  const stats: GlobalStreamingStats = {
    totalConnections: connections.size,
    activeConnections: Array.from(connections.values()).filter(c => 
      c.status === 'connected' || c.status === 'playing'
    ).length,
    totalBitrate: Array.from(connections.values()).reduce((sum, c) => sum + c.bitrate, 0),
    averageLatency: connections.size > 0 
      ? Array.from(connections.values()).reduce((sum, c) => sum + c.latency, 0) / connections.size 
      : 0,
    errorRate: connections.size > 0
      ? Array.from(connections.values()).filter(c => c.status === 'error').length / connections.size
      : 0,
  };

  // Conectar a um stream
  const connect = useCallback((
    cameraId: string, 
    hlsUrl: string, 
    videoElement: HTMLVideoElement
  ) => {
    // Verificar limite de conexões
    const activeCount = Array.from(connections.values()).filter(c => 
      c.status === 'connected' || c.status === 'playing' || c.status === 'connecting'
    ).length;

    if (activeCount >= config.maxConcurrentStreams) {
      // Desconectar stream de menor prioridade se necessário
      const sortedConnections = Array.from(connections.entries())
        .filter(([id]) => !visibleCameras.current.has(id))
        .sort((a, b) => {
          const aConn = a[1];
          const bConn = b[1];
          return (aConn.connectedAt?.getTime() || 0) - (bConn.connectedAt?.getTime() || 0);
        });

      if (sortedConnections.length > 0) {
        disconnect(sortedConnections[0][0]);
      }
    }

    // Criar nova conexão
    const connection: StreamConnection = {
      cameraId,
      hlsInstance: null,
      videoElement,
      status: 'connecting',
      quality: 'auto',
      bitrate: 0,
      latency: 0,
      buffered: 0,
      lastFrame: null,
      errorCount: 0,
      lastError: null,
      connectedAt: null,
    };

    // Inicializar HLS
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: config.lowLatencyMode,
        backBufferLength: config.bufferLength,
        maxBufferLength: config.bufferLength,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        connection.status = 'connected';
        connection.connectedAt = new Date();
        videoElement.play().catch(() => {});
        
        setConnections(prev => new Map(prev).set(cameraId, { ...connection, hlsInstance: hls }));
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          connection.status = 'error';
          connection.errorCount++;
          connection.lastError = data.details;
          
          setConnections(prev => new Map(prev).set(cameraId, { ...connection }));
          
          // Reconectar
          scheduleReconnect(cameraId, hlsUrl, videoElement);
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, (_, data) => {
        const stats = data.frag.stats;
        if (stats) {
          connection.bitrate = Math.round((stats.total || 0) * 8 / 1000);
          connection.latency = stats.loading?.end 
            ? stats.loading.end - stats.loading.start 
            : 0;
        }
        connection.buffered = videoElement.buffered.length > 0
          ? videoElement.buffered.end(0) - videoElement.currentTime
          : 0;
          
        setConnections(prev => new Map(prev).set(cameraId, { ...connection }));
      });

      connection.hlsInstance = hls;
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari nativo
      videoElement.src = hlsUrl;
      videoElement.addEventListener('loadedmetadata', () => {
        connection.status = 'connected';
        connection.connectedAt = new Date();
        videoElement.play().catch(() => {});
        setConnections(prev => new Map(prev).set(cameraId, { ...connection }));
      });
    }

    setConnections(prev => new Map(prev).set(cameraId, connection));

    // Iniciar captura de thumbnails
    startThumbnailCapture(cameraId, videoElement);
  }, [connections, config]);

  // Desconectar
  const disconnect = useCallback((cameraId: string) => {
    const connection = connections.get(cameraId);
    if (!connection) return;

    // Limpar HLS
    if (connection.hlsInstance) {
      connection.hlsInstance.destroy();
    }

    // Limpar timers
    const reconnectTimer = reconnectTimers.current.get(cameraId);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimers.current.delete(cameraId);
    }

    const thumbnailInterval = thumbnailIntervals.current.get(cameraId);
    if (thumbnailInterval) {
      clearInterval(thumbnailInterval);
      thumbnailIntervals.current.delete(cameraId);
    }

    setConnections(prev => {
      const next = new Map(prev);
      next.delete(cameraId);
      return next;
    });
  }, [connections]);

  // Desconectar todos
  const disconnectAll = useCallback(() => {
    connections.forEach((_, cameraId) => disconnect(cameraId));
  }, [connections, disconnect]);

  // Marcar como visível/invisível
  const setVisible = useCallback((cameraId: string, visible: boolean) => {
    if (visible) {
      visibleCameras.current.add(cameraId);
    } else {
      visibleCameras.current.delete(cameraId);
    }
  }, []);

  // Definir qualidade
  const setQuality = useCallback((cameraId: string, quality: StreamQuality) => {
    const connection = connections.get(cameraId);
    if (!connection?.hlsInstance) return;

    const hls = connection.hlsInstance;
    
    switch (quality) {
      case 'auto':
        hls.currentLevel = -1;
        break;
      case 'low':
        hls.currentLevel = 0;
        break;
      case 'medium':
        hls.currentLevel = Math.floor(hls.levels.length / 2);
        break;
      case 'high':
        hls.currentLevel = hls.levels.length - 1;
        break;
    }

    setConnections(prev => {
      const next = new Map(prev);
      const conn = next.get(cameraId);
      if (conn) {
        next.set(cameraId, { ...conn, quality });
      }
      return next;
    });
  }, [connections]);

  // Obter conexão
  const getConnection = useCallback((cameraId: string) => {
    return connections.get(cameraId);
  }, [connections]);

  // Obter thumbnail
  const getThumbnail = useCallback((cameraId: string) => {
    return connections.get(cameraId)?.lastFrame || null;
  }, [connections]);

  // Atualizar config
  const updateConfig = useCallback((updates: Partial<GlobalStreamingConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Agendar reconexão
  const scheduleReconnect = useCallback((
    cameraId: string, 
    hlsUrl: string, 
    videoElement: HTMLVideoElement
  ) => {
    const connection = connections.get(cameraId);
    if (!connection || connection.errorCount >= config.maxReconnectAttempts) {
      return;
    }

    // Limpar timer anterior
    const existingTimer = reconnectTimers.current.get(cameraId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Agendar reconexão com backoff exponencial
    const delay = config.reconnectDelay * Math.pow(2, connection.errorCount - 1);
    const timer = setTimeout(() => {
      disconnect(cameraId);
      connect(cameraId, hlsUrl, videoElement);
    }, delay);

    reconnectTimers.current.set(cameraId, timer);
  }, [connections, config, connect, disconnect]);

  // Capturar thumbnails periodicamente
  const startThumbnailCapture = useCallback((cameraId: string, videoElement: HTMLVideoElement) => {
    const captureFrame = () => {
      if (videoElement.readyState >= 2) {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth / 4;
        canvas.height = videoElement.videoHeight / 4;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
          
          setConnections(prev => {
            const next = new Map(prev);
            const conn = next.get(cameraId);
            if (conn) {
              next.set(cameraId, { ...conn, lastFrame: dataUrl });
            }
            return next;
          });
        }
      }
    };

    // Capturar imediatamente e então periodicamente
    captureFrame();
    const interval = setInterval(captureFrame, config.thumbnailInterval);
    thumbnailIntervals.current.set(cameraId, interval);
  }, [config.thumbnailInterval]);

  // Cleanup
  useEffect(() => {
    return () => {
      disconnectAll();
    };
  }, []);

  const value: GlobalStreamingContextValue = {
    connections,
    stats,
    config,
    connect,
    disconnect,
    disconnectAll,
    setVisible,
    setQuality,
    getConnection,
    getThumbnail,
    updateConfig,
  };

  return (
    <GlobalStreamingContext.Provider value={value}>
      {children}
    </GlobalStreamingContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useGlobalStreaming() {
  const context = useContext(GlobalStreamingContext);
  
  if (!context) {
    throw new Error('useGlobalStreaming must be used within GlobalStreamingProvider');
  }
  
  return context;
}

// ============================================
// HOOK PARA CÂMERA INDIVIDUAL
// ============================================

interface UseCameraStreamOptions {
  cameraId: string;
  hlsUrl: string;
  autoConnect?: boolean;
}

export function useCameraStream({ 
  cameraId, 
  hlsUrl, 
  autoConnect = true 
}: UseCameraStreamOptions) {
  const { connect, disconnect, getConnection, setVisible, setQuality } = useGlobalStreaming();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!mounted || !autoConnect || !videoRef.current || !hlsUrl) return;
    
    connect(cameraId, hlsUrl, videoRef.current);
    
    return () => {
      disconnect(cameraId);
    };
  }, [mounted, autoConnect, cameraId, hlsUrl, connect, disconnect]);

  const connection = getConnection(cameraId);

  return {
    videoRef,
    connection,
    status: connection?.status || 'idle',
    bitrate: connection?.bitrate || 0,
    latency: connection?.latency || 0,
    thumbnail: connection?.lastFrame || null,
    setVisible: (visible: boolean) => setVisible(cameraId, visible),
    setQuality: (quality: StreamQuality) => setQuality(cameraId, quality),
    reconnect: () => {
      if (videoRef.current) {
        disconnect(cameraId);
        connect(cameraId, hlsUrl, videoRef.current);
      }
    },
  };
}

export default useGlobalStreaming;
