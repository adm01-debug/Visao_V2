import { retry, withRetry } from "@/lib/retry";
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useMediaMTX
 * 
 * Gerencia conexão com servidor MediaMTX para streaming:
 * - Listagem de streams disponíveis
 * - Status das câmeras
 * - Geração de URLs HLS/WebRTC
 * - Gerenciamento dinâmico de paths
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

export interface MediaMTXPath {
  name: string;
  confName: string;
  source: {
    type: string;
    id: string;
  } | null;
  ready: boolean;
  readyTime: string | null;
  tracks: string[];
  bytesReceived: number;
  bytesSent: number;
  readers: {
    type: string;
    id: string;
  }[];
}

export interface MediaMTXConfig {
  hlsAddress: string;
  webrtcAddress: string;
  rtspAddress: string;
  apiAddress: string;
}

export interface StreamInfo {
  name: string;
  hlsUrl: string;
  webrtcUrl: string;
  rtspUrl: string;
  isReady: boolean;
  viewers: number;
  bytesReceived: number;
  bytesSent: number;
  tracks: string[];
}

export interface MediaMTXStats {
  totalPaths: number;
  activePaths: number;
  totalViewers: number;
  totalBytesReceived: number;
  totalBytesSent: number;
}

// ============================================
// CONSTANTES
// ============================================

const DEFAULT_CONFIG: MediaMTXConfig = {
  hlsAddress: import.meta.env.VITE_MEDIAMTX_HLS_URL || 'http://localhost:8888',
  webrtcAddress: import.meta.env.VITE_MEDIAMTX_WEBRTC_URL || 'http://localhost:8889',
  rtspAddress: import.meta.env.VITE_MEDIAMTX_RTSP_URL || 'rtsp://localhost:8554',
  apiAddress: import.meta.env.VITE_MEDIAMTX_API_URL || 'http://localhost:9997',
};

// ============================================
// HOOK PRINCIPAL
// ============================================

interface UseMediaMTXOptions {
  config?: Partial<MediaMTXConfig>;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onError?: (error: Error) => void;
}

interface UseMediaMTXReturn {
  // Estado
  paths: MediaMTXPath[];
  streams: StreamInfo[];
  stats: MediaMTXStats;
  loading: boolean;
  error: string | null;
  connected: boolean;

  // URLs
  getHlsUrl: (pathName: string) => string;
  getWebRTCUrl: (pathName: string) => string;
  getRtspUrl: (pathName: string) => string;

  // Ações
  refresh: () => Promise<void>;
  addPath: (name: string, source: string) => Promise<boolean>;
  removePath: (name: string) => Promise<boolean>;
  getPathInfo: (name: string) => Promise<MediaMTXPath | null>;

  // Config
  config: MediaMTXConfig;
  updateConfig: (updates: Partial<MediaMTXConfig>) => void;
}

export function useMediaMTX(options: UseMediaMTXOptions = {}): UseMediaMTXReturn {
  const {
    config: initialConfig,
    autoRefresh = true,
    refreshInterval = 5000,
    onError,
  } = options;

  const [config, setConfig] = useState<MediaMTXConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });

  const [paths, setPaths] = useState<MediaMTXPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Buscar lista de paths
  const fetchPaths = useCallback(async (): Promise<MediaMTXPath[]> => {
    // Cancelar requisição anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${config.apiAddress}/v3/paths/list`, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.items || [];
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return paths; // Retorna estado atual se abortado
      }
      throw err;
    }
  }, [config.apiAddress, paths]);

  // Refresh completo
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const fetchedPaths = await fetchPaths();
      setPaths(fetchedPaths);
      setConnected(true);
    } catch (err: any) {
      const message = err.message || 'Erro ao conectar ao MediaMTX';
      setError(message);
      setConnected(false);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [fetchPaths, onError]);

  // Auto refresh
  useEffect(() => {
    refresh();

    if (autoRefresh && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(refresh, refreshInterval);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoRefresh, refreshInterval, refresh]);

  // Gerar URL HLS
  const getHlsUrl = useCallback((pathName: string): string => {
    const cleanPath = pathName.replace(/^\//, '');
    return `${config.hlsAddress}/${cleanPath}/index.m3u8`;
  }, [config.hlsAddress]);

  // Gerar URL WebRTC
  const getWebRTCUrl = useCallback((pathName: string): string => {
    const cleanPath = pathName.replace(/^\//, '');
    return `${config.webrtcAddress}/${cleanPath}`;
  }, [config.webrtcAddress]);

  // Gerar URL RTSP
  const getRtspUrl = useCallback((pathName: string): string => {
    const cleanPath = pathName.replace(/^\//, '');
    return `${config.rtspAddress}/${cleanPath}`;
  }, [config.rtspAddress]);

  // Adicionar novo path
  const addPath = useCallback(async (name: string, source: string): Promise<boolean> => {
    try {
      const response = await fetch(`${config.apiAddress}/v3/config/paths/add/${name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source,
          sourceOnDemand: true,
          sourceOnDemandCloseAfter: '30s',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      toast.success(`Stream "${name}" adicionado`);
      await refresh();
      return true;
    } catch (err: any) {
      toast.error(`Erro ao adicionar stream: ${err.message}`);
      return false;
    }
  }, [config.apiAddress, refresh]);

  // Remover path
  const removePath = useCallback(async (name: string): Promise<boolean> => {
    try {
      const response = await fetch(`${config.apiAddress}/v3/config/paths/remove/${name}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      toast.success(`Stream "${name}" removido`);
      await refresh();
      return true;
    } catch (err: any) {
      toast.error(`Erro ao remover stream: ${err.message}`);
      return false;
    }
  }, [config.apiAddress, refresh]);

  // Buscar info de um path específico
  const getPathInfo = useCallback(async (name: string): Promise<MediaMTXPath | null> => {
    try {
      const response = await fetch(`${config.apiAddress}/v3/paths/get/${name}`);
      
      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch {
      return null;
    }
  }, [config.apiAddress]);

  // Atualizar config
  const updateConfig = useCallback((updates: Partial<MediaMTXConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Converter paths para streams
  const streams: StreamInfo[] = paths.map(path => ({
    name: path.name,
    hlsUrl: getHlsUrl(path.name),
    webrtcUrl: getWebRTCUrl(path.name),
    rtspUrl: getRtspUrl(path.name),
    isReady: path.ready,
    viewers: path.readers?.length || 0,
    bytesReceived: path.bytesReceived || 0,
    bytesSent: path.bytesSent || 0,
    tracks: path.tracks || [],
  }));

  // Calcular estatísticas
  const stats: MediaMTXStats = {
    totalPaths: paths.length,
    activePaths: paths.filter(p => p.ready).length,
    totalViewers: paths.reduce((sum, p) => sum + (p.readers?.length || 0), 0),
    totalBytesReceived: paths.reduce((sum, p) => sum + (p.bytesReceived || 0), 0),
    totalBytesSent: paths.reduce((sum, p) => sum + (p.bytesSent || 0), 0),
  };

  return {
    paths,
    streams,
    stats,
    loading,
    error,
    connected,
    getHlsUrl,
    getWebRTCUrl,
    getRtspUrl,
    refresh,
    addPath,
    removePath,
    getPathInfo,
    config,
    updateConfig,
  };
}

export default useMediaMTX;
