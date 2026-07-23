/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useMediaMTX
 *
 * Gerencia conexão com o servidor MediaMTX para streaming:
 * - Listagem de streams disponíveis / status das câmeras
 * - Geração de URLs HLS/WebRTC/RTSP (plano de mídia, client-facing)
 * - Gerenciamento dinâmico de paths (plano de controle)
 *
 * SEGURANÇA: o plano de controle (Control API :9997) NUNCA é acessado direto
 * pelo browser. Todas as operações list/get/add/remove passam pela edge function
 * `mediamtx-proxy`, que autentica o usuário no Supabase e só então fala com o
 * MediaMTX pela rede interna (Basic auth injetado no servidor). O browser jamais
 * conhece o endereço ou as credenciais da Control API.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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

/** Endereços do PLANO DE MÍDIA (client-facing). O plano de controle não aparece aqui. */
export interface MediaMTXConfig {
  hlsAddress: string;
  webrtcAddress: string;
  rtspAddress: string;
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
};

const PROXY_FN = 'mediamtx-proxy';

// ============================================
// PROXY — plano de controle via edge function autenticada
// ============================================

interface ProxyPayload {
  action: 'list' | 'get' | 'add' | 'remove';
  name?: string;
  source?: string;
}

async function invokeProxy<T>(payload: ProxyPayload): Promise<T> {
  const { data, error } = await supabase.functions.invoke(PROXY_FN, { body: payload });
  if (error) {
    throw new Error(error.message || 'Falha no mediamtx-proxy');
  }
  return data as T;
}

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

  // URLs (plano de mídia)
  getHlsUrl: (pathName: string) => string;
  getWebRTCUrl: (pathName: string) => string;
  getRtspUrl: (pathName: string) => string;

  // Ações (plano de controle, via proxy)
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

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = useRef(false);

  // Refresh completo (list via proxy) — com guarda de concorrência
  const refresh = useCallback(async () => {
    if (inFlightRef.current) return; // evita empilhar requisições no polling
    inFlightRef.current = true;
    try {
      setError(null);
      const data = await invokeProxy<{ items: MediaMTXPath[] }>({ action: 'list' });
      setPaths(data.items || []);
      setConnected(true);
    } catch (err: unknown) {
      const message = (err as Error).message || 'Erro ao conectar ao MediaMTX';
      setError(message);
      setConnected(false);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [onError]);

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

  // Adicionar novo path (via proxy)
  const addPath = useCallback(async (name: string, source: string): Promise<boolean> => {
    try {
      await invokeProxy<{ ok: true }>({ action: 'add', name, source });
      toast.success(`Stream "${name}" adicionado`);
      await refresh();
      return true;
    } catch (err: unknown) {
      toast.error(`Erro ao adicionar stream: ${(err as Error).message}`);
      return false;
    }
  }, [refresh]);

  // Remover path (via proxy)
  const removePath = useCallback(async (name: string): Promise<boolean> => {
    try {
      await invokeProxy<{ ok: true }>({ action: 'remove', name });
      toast.success(`Stream "${name}" removido`);
      await refresh();
      return true;
    } catch (err: unknown) {
      toast.error(`Erro ao remover stream: ${(err as Error).message}`);
      return false;
    }
  }, [refresh]);

  // Buscar info de um path específico (via proxy)
  const getPathInfo = useCallback(async (name: string): Promise<MediaMTXPath | null> => {
    try {
      return await invokeProxy<MediaMTXPath | null>({ action: 'get', name });
    } catch {
      return null;
    }
  }, []);

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
