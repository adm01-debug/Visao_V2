/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Tipos para Streaming de Vídeo
 * 
 * Suporta múltiplos protocolos:
 * - HLS (HTTP Live Streaming) - Compatibilidade máxima
 * - WebRTC - Baixa latência
 * - RTSP (via proxy) - Câmeras IP tradicionais
 */

// ============================================
// TIPOS DE PROTOCOLO
// ============================================

export type StreamProtocol = 'hls' | 'webrtc' | 'rtsp' | 'mjpeg';

export type StreamQuality = 'auto' | '1080p' | '720p' | '480p' | '360p';

export type StreamStatus = 
  | 'disconnected'    // Sem conexão
  | 'connecting'      // Tentando conectar
  | 'connected'       // Conectado, aguardando dados
  | 'playing'         // Reproduzindo vídeo
  | 'buffering'       // Carregando buffer
  | 'paused'          // Pausado pelo usuário
  | 'error'           // Erro de conexão
  | 'reconnecting';   // Reconectando após falha

// ============================================
// CONFIGURAÇÃO DE STREAM
// ============================================

export interface StreamConfig {
  /** URL do stream (HLS m3u8, WebRTC signaling, RTSP) */
  url: string;
  
  /** Protocolo de streaming */
  protocol: StreamProtocol;
  
  /** Qualidade preferida */
  preferredQuality?: StreamQuality;
  
  /** Credenciais de autenticação */
  credentials?: {
    username: string;
    password: string;
  };
  
  /** Configurações de reconexão */
  reconnection?: {
    enabled: boolean;
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier: number;
  };
  
  /** Buffer de vídeo em segundos */
  bufferLength?: number;
  
  /** Latência alvo para WebRTC (ms) */
  targetLatency?: number;
  
  /** Habilitar áudio */
  enableAudio?: boolean;
}

// Configuração padrão
export const defaultStreamConfig: Partial<StreamConfig> = {
  protocol: 'hls',
  preferredQuality: 'auto',
  reconnection: {
    enabled: true,
    maxAttempts: 5,
    delayMs: 2000,
    backoffMultiplier: 1.5,
  },
  bufferLength: 3,
  targetLatency: 500,
  enableAudio: false,
};

// ============================================
// ESTADO DO STREAM
// ============================================

export interface StreamState {
  /** Status atual da conexão */
  status: StreamStatus;
  
  /** Está reproduzindo? */
  isPlaying: boolean;
  
  /** Está mutado? */
  isMuted: boolean;
  
  /** Volume (0-1) */
  volume: number;
  
  /** Qualidade atual */
  currentQuality: StreamQuality;
  
  /** Qualidades disponíveis */
  availableQualities: StreamQuality[];
  
  /** Estatísticas de rede */
  stats: StreamStats;
  
  /** Erro atual (se houver) */
  error: StreamError | null;
  
  /** Timestamp do último frame */
  lastFrameTime: number | null;
  
  /** Está em fullscreen? */
  isFullscreen: boolean;
  
  /** Mostrando controles? */
  showControls: boolean;
}

export interface StreamStats {
  /** Bitrate atual (kbps) */
  bitrate: number;
  
  /** FPS atual */
  fps: number;
  
  /** Resolução atual */
  resolution: { width: number; height: number };
  
  /** Latência estimada (ms) */
  latency: number;
  
  /** Frames perdidos */
  droppedFrames: number;
  
  /** Buffer atual (segundos) */
  buffered: number;
  
  /** Tempo de conexão (ms) */
  connectionTime: number;
  
  /** Tentativas de reconexão */
  reconnectAttempts: number;
}

export interface StreamError {
  /** Código do erro */
  code: StreamErrorCode;
  
  /** Mensagem amigável */
  message: string;
  
  /** Detalhes técnicos */
  details?: string;
  
  /** Timestamp do erro */
  timestamp: Date;
  
  /** Pode tentar novamente? */
  recoverable: boolean;
}

export type StreamErrorCode = 
  | 'NETWORK_ERROR'       // Erro de rede
  | 'PROTOCOL_ERROR'      // Erro de protocolo
  | 'AUTH_ERROR'          // Falha de autenticação
  | 'FORMAT_ERROR'        // Formato não suportado
  | 'TIMEOUT'             // Timeout de conexão
  | 'CAMERA_OFFLINE'      // Câmera offline
  | 'PERMISSION_DENIED'   // Sem permissão
  | 'QUOTA_EXCEEDED'      // Cota excedida
  | 'UNKNOWN';            // Erro desconhecido

// ============================================
// EVENTOS DE STREAM
// ============================================

export interface StreamEvents {
  /** Chamado quando conecta */
  onConnect?: () => void;
  
  /** Chamado quando desconecta */
  onDisconnect?: (reason?: string) => void;
  
  /** Chamado quando começa a reproduzir */
  onPlay?: () => void;
  
  /** Chamado quando pausa */
  onPause?: () => void;
  
  /** Chamado quando ocorre erro */
  onError?: (error: StreamError) => void;
  
  /** Chamado quando stats atualizam */
  onStatsUpdate?: (stats: StreamStats) => void;
  
  /** Chamado quando qualidade muda */
  onQualityChange?: (quality: StreamQuality) => void;
  
  /** Chamado quando captura snapshot */
  onSnapshot?: (imageData: string) => void;
  
  /** Chamado a cada frame (para análise) */
  onFrame?: (frameData: ImageData) => void;
}

// ============================================
// CONTROLES PTZ (Pan-Tilt-Zoom)
// ============================================

export interface PTZCapabilities {
  /** Suporta pan (horizontal) */
  canPan: boolean;
  
  /** Suporta tilt (vertical) */
  canTilt: boolean;
  
  /** Suporta zoom */
  canZoom: boolean;
  
  /** Suporta presets */
  canPreset: boolean;
  
  /** Limites de movimento */
  limits?: {
    panMin: number;
    panMax: number;
    tiltMin: number;
    tiltMax: number;
    zoomMin: number;
    zoomMax: number;
  };
  
  /** Presets disponíveis */
  presets?: PTZPreset[];
}

export interface PTZPreset {
  id: string;
  name: string;
  thumbnail?: string;
}

export interface PTZCommand {
  action: 'pan' | 'tilt' | 'zoom' | 'goto_preset' | 'stop';
  direction?: 'left' | 'right' | 'up' | 'down' | 'in' | 'out';
  speed?: number; // 0-100
  presetId?: string;
}

// ============================================
// CÂMERA COM STREAMING
// ============================================

export interface CameraStream {
  /** ID da câmera */
  cameraId: string;
  
  /** Nome da câmera */
  cameraName: string;
  
  /** Configuração do stream */
  config: StreamConfig;
  
  /** Capacidades PTZ */
  ptz?: PTZCapabilities;
  
  /** Streams alternativos (multi-qualidade) */
  alternativeStreams?: {
    quality: StreamQuality;
    url: string;
  }[];
  
  /** Thumbnail atual */
  currentThumbnail?: string;
  
  /** Última atualização */
  lastUpdated: Date;
}

// ============================================
// GRAVAÇÃO DE STREAM
// ============================================

export interface StreamRecording {
  id: string;
  cameraId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // segundos
  fileUrl?: string;
  fileSize?: number; // bytes
  status: 'recording' | 'processing' | 'ready' | 'error';
  triggerType: 'manual' | 'alert' | 'schedule' | 'motion';
  triggerId?: string; // ID do alerta/regra que disparou
}

// ============================================
// HELPER: Mensagens de erro amigáveis
// ============================================

export const streamErrorMessages: Record<StreamErrorCode, string> = {
  NETWORK_ERROR: 'Erro de conexão de rede. Verifique sua internet.',
  PROTOCOL_ERROR: 'Protocolo de streaming não suportado.',
  AUTH_ERROR: 'Credenciais inválidas para acessar a câmera.',
  FORMAT_ERROR: 'Formato de vídeo não suportado pelo navegador.',
  TIMEOUT: 'Tempo limite de conexão excedido.',
  CAMERA_OFFLINE: 'A câmera está offline ou inacessível.',
  PERMISSION_DENIED: 'Sem permissão para acessar esta câmera.',
  QUOTA_EXCEEDED: 'Limite de streams simultâneos atingido.',
  UNKNOWN: 'Erro desconhecido. Tente novamente.',
};

// ============================================
// HELPER: URLs de exemplo para teste
// ============================================

export const testStreamUrls = {
  // Streams HLS públicos para teste
  hls: {
    bigBuckBunny: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    sintel: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    tearsOfSteel: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
  },
  // Streams MJPEG públicos para teste
  mjpeg: {
    // Câmeras públicas de exemplo (podem mudar)
    sample: 'http://pendelcam.kip.uni-heidelberg.de/mjpg/video.mjpg',
  },
};
