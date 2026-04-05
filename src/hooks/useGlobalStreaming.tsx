/**
 * VISÃO - useGlobalStreaming (Refactored)
 * Types extracted to ./global-streaming/streamingTypes.ts
 */
import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import Hls from 'hls.js';
import {
  StreamQuality, StreamStatus, StreamConnection, GlobalStreamingStats,
  GlobalStreamingConfig, DEFAULT_STREAMING_CONFIG, CameraStreamConfig,
} from './global-streaming/streamingTypes';

// Re-export types
export type { StreamQuality, StreamStatus, StreamConnection, CameraStreamConfig, GlobalStreamingStats, GlobalStreamingConfig };

interface GlobalStreamingContextValue {
  connections: Map<string, StreamConnection>;
  stats: GlobalStreamingStats;
  config: GlobalStreamingConfig;
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

interface GlobalStreamingProviderProps {
  children: React.ReactNode;
  config?: Partial<GlobalStreamingConfig>;
}

export function GlobalStreamingProvider({ children, config: initialConfig }: GlobalStreamingProviderProps) {
  const [connections, setConnections] = useState<Map<string, StreamConnection>>(new Map());
  const [config, setConfig] = useState<GlobalStreamingConfig>({ ...DEFAULT_STREAMING_CONFIG, ...initialConfig });
  const visibleCameras = useRef<Set<string>>(new Set());
  const reconnectTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const thumbnailIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const stats: GlobalStreamingStats = {
    totalConnections: connections.size,
    activeConnections: Array.from(connections.values()).filter(c => c.status === 'connected' || c.status === 'playing').length,
    totalBitrate: Array.from(connections.values()).reduce((s, c) => s + c.bitrate, 0),
    averageLatency: connections.size > 0 ? Array.from(connections.values()).reduce((s, c) => s + c.latency, 0) / connections.size : 0,
    errorRate: connections.size > 0 ? Array.from(connections.values()).filter(c => c.status === 'error').length / connections.size : 0,
  };

  const startThumbnailCapture = useCallback((cameraId: string, videoElement: HTMLVideoElement) => {
    const captureFrame = () => {
      if (videoElement.readyState >= 2) {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth / 4; canvas.height = videoElement.videoHeight / 4;
        const ctx = canvas.getContext('2d');
        if (ctx) { ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height); const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
          setConnections(prev => { const n = new Map(prev); const c = n.get(cameraId); if (c) n.set(cameraId, { ...c, lastFrame: dataUrl }); return n; });
        }
      }
    };
    captureFrame();
    const interval = setInterval(captureFrame, config.thumbnailInterval);
    thumbnailIntervals.current.set(cameraId, interval);
  }, [config.thumbnailInterval]);

  const disconnect = useCallback((cameraId: string) => {
    const conn = connections.get(cameraId); if (!conn) return;
    conn.hlsInstance?.destroy();
    const rt = reconnectTimers.current.get(cameraId); if (rt) { clearTimeout(rt); reconnectTimers.current.delete(cameraId); }
    const ti = thumbnailIntervals.current.get(cameraId); if (ti) { clearInterval(ti); thumbnailIntervals.current.delete(cameraId); }
    setConnections(prev => { const n = new Map(prev); n.delete(cameraId); return n; });
  }, [connections]);

  const connect = useCallback((cameraId: string, hlsUrl: string, videoElement: HTMLVideoElement) => {
    const active = Array.from(connections.values()).filter(c => ['connected', 'playing', 'connecting'].includes(c.status)).length;
    if (active >= config.maxConcurrentStreams) {
      const sorted = Array.from(connections.entries()).filter(([id]) => !visibleCameras.current.has(id)).sort((a, b) => (a[1].connectedAt?.getTime() || 0) - (b[1].connectedAt?.getTime() || 0));
      if (sorted.length > 0) disconnect(sorted[0]![0]!);
    }
    const connection: StreamConnection = { cameraId, hlsInstance: null, videoElement, status: 'connecting', quality: 'auto', bitrate: 0, latency: 0, buffered: 0, lastFrame: null, errorCount: 0, lastError: null, connectedAt: null };
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: config.lowLatencyMode, backBufferLength: config.bufferLength, maxBufferLength: config.bufferLength, liveSyncDurationCount: 3, liveMaxLatencyDurationCount: 6 });
      hls.loadSource(hlsUrl); hls.attachMedia(videoElement);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { connection.status = 'connected'; connection.connectedAt = new Date(); videoElement.play().catch(() => {}); setConnections(prev => new Map(prev).set(cameraId, { ...connection, hlsInstance: hls })); });
      hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) { connection.status = 'error'; connection.errorCount++; connection.lastError = data.details; setConnections(prev => new Map(prev).set(cameraId, { ...connection })); scheduleReconnect(cameraId, hlsUrl, videoElement); } });
      hls.on(Hls.Events.FRAG_LOADED, (_, data) => { const s = data.frag.stats; if (s) { connection.bitrate = Math.round((s.total || 0) * 8 / 1000); connection.latency = s.loading?.end ? s.loading.end - s.loading.start : 0; } connection.buffered = videoElement.buffered.length > 0 ? videoElement.buffered.end(0) - videoElement.currentTime : 0; setConnections(prev => new Map(prev).set(cameraId, { ...connection })); });
      connection.hlsInstance = hls;
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      videoElement.src = hlsUrl;
      videoElement.addEventListener('loadedmetadata', () => { connection.status = 'connected'; connection.connectedAt = new Date(); videoElement.play().catch(() => {}); setConnections(prev => new Map(prev).set(cameraId, { ...connection })); });
    }
    setConnections(prev => new Map(prev).set(cameraId, connection));
    startThumbnailCapture(cameraId, videoElement);
  }, [connections, config, disconnect, startThumbnailCapture]);

  const disconnectAll = useCallback(() => { connections.forEach((_, id) => disconnect(id)); }, [connections, disconnect]);
  const setVisible = useCallback((cameraId: string, visible: boolean) => { visible ? visibleCameras.current.add(cameraId) : visibleCameras.current.delete(cameraId); }, []);

  const setQuality = useCallback((cameraId: string, quality: StreamQuality) => {
    const conn = connections.get(cameraId); if (!conn?.hlsInstance) return;
    const hls = conn.hlsInstance;
    if (quality === 'auto') hls.currentLevel = -1; else if (quality === 'low') hls.currentLevel = 0; else if (quality === 'medium') hls.currentLevel = Math.floor(hls.levels.length / 2); else hls.currentLevel = hls.levels.length - 1;
    setConnections(prev => { const n = new Map(prev); const c = n.get(cameraId); if (c) n.set(cameraId, { ...c, quality }); return n; });
  }, [connections]);

  const getConnection = useCallback((id: string) => connections.get(id), [connections]);
  const getThumbnail = useCallback((id: string) => connections.get(id)?.lastFrame || null, [connections]);
  const updateConfig = useCallback((updates: Partial<GlobalStreamingConfig>) => setConfig(prev => ({ ...prev, ...updates })), []);

  const scheduleReconnect = useCallback((cameraId: string, hlsUrl: string, videoElement: HTMLVideoElement) => {
    const conn = connections.get(cameraId); if (!conn || conn.errorCount >= config.maxReconnectAttempts) return;
    const existing = reconnectTimers.current.get(cameraId); if (existing) clearTimeout(existing);
    const delay = config.reconnectDelay * Math.pow(2, conn.errorCount - 1);
    reconnectTimers.current.set(cameraId, setTimeout(() => { disconnect(cameraId); connect(cameraId, hlsUrl, videoElement); }, delay));
  }, [connections, config, connect, disconnect]);

  useEffect(() => () => { disconnectAll(); }, []);

  return <GlobalStreamingContext.Provider value={{ connections, stats, config, connect, disconnect, disconnectAll, setVisible, setQuality, getConnection, getThumbnail, updateConfig }}>{children}</GlobalStreamingContext.Provider>;
}

export function useGlobalStreaming() {
  const ctx = useContext(GlobalStreamingContext);
  if (!ctx) throw new Error('useGlobalStreaming must be used within GlobalStreamingProvider');
  return ctx;
}

interface UseCameraStreamOptions { cameraId: string; hlsUrl: string; autoConnect?: boolean; }

export function useCameraStream({ cameraId, hlsUrl, autoConnect = true }: UseCameraStreamOptions) {
  const { connect, disconnect, getConnection, setVisible, setQuality } = useGlobalStreaming();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  useEffect(() => { if (!mounted || !autoConnect || !videoRef.current || !hlsUrl) return; connect(cameraId, hlsUrl, videoRef.current); return () => { disconnect(cameraId); }; }, [mounted, autoConnect, cameraId, hlsUrl, connect, disconnect]);
  const connection = getConnection(cameraId);
  return { videoRef, connection, status: connection?.status || 'idle', bitrate: connection?.bitrate || 0, latency: connection?.latency || 0, thumbnail: connection?.lastFrame || null, setVisible: (v: boolean) => setVisible(cameraId, v), setQuality: (q: StreamQuality) => setQuality(cameraId, q), reconnect: () => { if (videoRef.current) { disconnect(cameraId); connect(cameraId, hlsUrl, videoRef.current); } } };
}

export default useGlobalStreaming;
