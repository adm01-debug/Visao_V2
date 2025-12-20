/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Tipos para Gravação de Clips de Vídeo
 * 
 * Define estruturas para:
 * - Configuração de gravação
 * - Clips gravados
 * - Triggers de gravação
 * - Armazenamento e exportação
 */

// ============================================
// STATUS E TIPOS DE TRIGGER
// ============================================

/** Status de uma gravação */
export type RecordingStatus = 
  | 'idle'         // Aguardando
  | 'recording'    // Gravando
  | 'processing'   // Processando/salvando
  | 'ready'        // Pronto para visualização
  | 'uploading'    // Enviando para storage
  | 'error';       // Erro

/** O que disparou a gravação */
export type RecordingTrigger = 
  | 'manual'       // Usuário clicou em gravar
  | 'alert'        // Alerta de IA detectado
  | 'motion'       // Detecção de movimento
  | 'schedule'     // Agendamento programado
  | 'rule'         // Regra de negócio violada
  | 'api';         // Chamada de API externa

/** Formato de saída do clip */
export type ClipFormat = 'mp4' | 'webm' | 'gif';

/** Qualidade do clip */
export type ClipQuality = 'low' | 'medium' | 'high' | 'original';

// ============================================
// CONFIGURAÇÃO DE GRAVAÇÃO
// ============================================

export interface RecordingConfig {
  /** ID único da configuração */
  id: string;
  
  /** ID da câmera */
  cameraId: string;
  
  /** Duração máxima do clip (segundos) */
  maxDuration: number;
  
  /** Duração mínima do clip (segundos) */
  minDuration: number;
  
  /** Segundos antes do evento (pre-buffer) */
  preEventSeconds: number;
  
  /** Segundos após o evento (post-buffer) */
  postEventSeconds: number;
  
  /** Formato de saída */
  format: ClipFormat;
  
  /** Qualidade */
  quality: ClipQuality;
  
  /** FPS do clip */
  fps: number;
  
  /** Triggers automáticos habilitados */
  autoTriggers: {
    onAlert: boolean;
    onMotion: boolean;
    onRule: boolean;
    minSeverity?: 'low' | 'medium' | 'high' | 'critical';
  };
  
  /** Armazenamento */
  storage: {
    /** Salvar localmente */
    saveLocal: boolean;
    /** Upload para Supabase Storage */
    uploadToCloud: boolean;
    /** Bucket do Supabase */
    bucket?: string;
    /** Reter por X dias (0 = indefinido) */
    retentionDays: number;
  };
  
  /** Marca d'água */
  watermark?: {
    enabled: boolean;
    text?: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    includeTimestamp: boolean;
  };
}

/** Configuração padrão */
export const defaultRecordingConfig: RecordingConfig = {
  id: '',
  cameraId: '',
  maxDuration: 60,
  minDuration: 5,
  preEventSeconds: 5,
  postEventSeconds: 10,
  format: 'mp4',
  quality: 'high',
  fps: 15,
  autoTriggers: {
    onAlert: true,
    onMotion: false,
    onRule: true,
    minSeverity: 'medium',
  },
  storage: {
    saveLocal: true,
    uploadToCloud: true,
    bucket: 'clips',
    retentionDays: 30,
  },
  watermark: {
    enabled: true,
    includeTimestamp: true,
    position: 'bottom-right',
  },
};

// ============================================
// CLIP GRAVADO
// ============================================

export interface VideoClip {
  /** ID único do clip */
  id: string;
  
  /** ID da câmera */
  cameraId: string;
  
  /** Nome da câmera */
  cameraName: string;
  
  /** Status atual */
  status: RecordingStatus;
  
  /** O que disparou */
  trigger: RecordingTrigger;
  
  /** ID do trigger (alerta, regra, etc) */
  triggerId?: string;
  
  /** Detalhes do trigger */
  triggerDetails?: {
    type?: string;
    severity?: string;
    message?: string;
    analysisResult?: any;
  };
  
  /** Timestamps */
  startedAt: Date;
  endedAt?: Date;
  
  /** Duração em segundos */
  duration: number;
  
  /** URL do arquivo */
  fileUrl?: string;
  
  /** URL local (blob) */
  localUrl?: string;
  
  /** Tamanho em bytes */
  fileSize?: number;
  
  /** Formato */
  format: ClipFormat;
  
  /** Thumbnail */
  thumbnailUrl?: string;
  
  /** Frames capturados */
  frameCount: number;
  
  /** Metadados adicionais */
  metadata?: {
    resolution?: string;
    fps?: number;
    codec?: string;
    bitrate?: number;
    peopleDetected?: number;
    alertsInClip?: number;
  };
  
  /** Tags para organização */
  tags?: string[];
  
  /** Notas do usuário */
  notes?: string;
  
  /** Marcado como favorito */
  isFavorite?: boolean;
  
  /** Já foi visualizado */
  isViewed?: boolean;
  
  /** Criado em */
  createdAt: Date;
  
  /** Atualizado em */
  updatedAt: Date;
}

// ============================================
// SESSÃO DE GRAVAÇÃO ATIVA
// ============================================

export interface RecordingSession {
  /** ID da sessão */
  id: string;
  
  /** ID da câmera */
  cameraId: string;
  
  /** Status */
  status: RecordingStatus;
  
  /** Configuração ativa */
  config: RecordingConfig;
  
  /** Trigger que iniciou */
  trigger: RecordingTrigger;
  triggerId?: string;
  triggerDetails?: VideoClip['triggerDetails'];
  
  /** Frames capturados até agora */
  frames: Blob[];
  frameCount: number;
  
  /** Timestamps */
  startedAt: Date;
  
  /** Duração atual (segundos) */
  currentDuration: number;
  
  /** Pre-buffer (frames antes do evento) */
  preBuffer: Blob[];
  
  /** Erro (se houver) */
  error?: string;
}

// ============================================
// EVENTOS DE GRAVAÇÃO
// ============================================

export interface RecordingEvents {
  /** Gravação iniciada */
  onRecordingStart?: (session: RecordingSession) => void;
  
  /** Frame capturado */
  onFrameCapture?: (session: RecordingSession, frameNumber: number) => void;
  
  /** Gravação finalizada */
  onRecordingEnd?: (session: RecordingSession) => void;
  
  /** Clip pronto */
  onClipReady?: (clip: VideoClip) => void;
  
  /** Upload concluído */
  onUploadComplete?: (clip: VideoClip) => void;
  
  /** Erro */
  onRecordingError?: (error: Error, session?: RecordingSession) => void;
  
  /** Progresso do processamento */
  onProcessingProgress?: (progress: number, session: RecordingSession) => void;
}

// ============================================
// FILTROS E BUSCA DE CLIPS
// ============================================

export interface ClipFilters {
  /** IDs de câmeras */
  cameraIds?: string[];
  
  /** Período */
  dateRange?: {
    start: Date;
    end: Date;
  };
  
  /** Tipos de trigger */
  triggers?: RecordingTrigger[];
  
  /** Status */
  status?: RecordingStatus[];
  
  /** Duração mínima (segundos) */
  minDuration?: number;
  
  /** Duração máxima (segundos) */
  maxDuration?: number;
  
  /** Apenas favoritos */
  favoritesOnly?: boolean;
  
  /** Apenas não visualizados */
  unviewedOnly?: boolean;
  
  /** Tags */
  tags?: string[];
  
  /** Busca por texto (notas, tags) */
  search?: string;
  
  /** Ordenação */
  sortBy?: 'date' | 'duration' | 'camera' | 'trigger';
  sortOrder?: 'asc' | 'desc';
  
  /** Paginação */
  page?: number;
  pageSize?: number;
}

// ============================================
// ESTATÍSTICAS DE CLIPS
// ============================================

export interface ClipStats {
  /** Total de clips */
  totalClips: number;
  
  /** Duração total (segundos) */
  totalDuration: number;
  
  /** Tamanho total (bytes) */
  totalSize: number;
  
  /** Por trigger */
  byTrigger: Record<RecordingTrigger, number>;
  
  /** Por câmera */
  byCamera: Record<string, number>;
  
  /** Por dia (últimos 7 dias) */
  byDay: { date: string; count: number }[];
  
  /** Clips favoritos */
  favoritesCount: number;
  
  /** Não visualizados */
  unviewedCount: number;
}

// ============================================
// EXPORTAÇÃO EM LOTE
// ============================================

export interface BatchExportConfig {
  /** IDs dos clips */
  clipIds: string[];
  
  /** Formato de saída */
  format: ClipFormat;
  
  /** Qualidade */
  quality: ClipQuality;
  
  /** Concatenar em um único arquivo */
  concatenate: boolean;
  
  /** Incluir metadados */
  includeMetadata: boolean;
  
  /** Nome do arquivo de saída */
  outputName?: string;
}

export interface BatchExportProgress {
  /** Total de clips */
  total: number;
  
  /** Clips processados */
  processed: number;
  
  /** Progresso (0-100) */
  progress: number;
  
  /** Status atual */
  status: 'preparing' | 'processing' | 'finalizing' | 'complete' | 'error';
  
  /** Clip atual sendo processado */
  currentClip?: string;
  
  /** Erro (se houver) */
  error?: string;
}

// ============================================
// HELPERS
// ============================================

/**
 * Formata duração em segundos para string legível
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) {
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

/**
 * Formata tamanho de arquivo
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Gera nome de arquivo para clip
 */
export function generateClipFilename(
  cameraName: string,
  trigger: RecordingTrigger,
  date: Date,
  format: ClipFormat
): string {
  const timestamp = date.toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '_')
    .slice(0, 15);
  const safeName = cameraName.replace(/[^a-zA-Z0-9]/g, '_');
  return `clip_${safeName}_${trigger}_${timestamp}.${format}`;
}

/**
 * Calcula tamanho estimado do clip
 */
export function estimateClipSize(
  durationSeconds: number,
  quality: ClipQuality,
  fps: number
): number {
  // Estimativas de bitrate por qualidade (kbps)
  const bitrates: Record<ClipQuality, number> = {
    low: 500,
    medium: 1500,
    high: 3000,
    original: 5000,
  };
  
  const bitrate = bitrates[quality];
  // Tamanho em bytes = (bitrate * duração) / 8
  return Math.round((bitrate * 1000 * durationSeconds) / 8);
}

/**
 * Verifica se trigger atende severidade mínima
 */
export function meetsSeverityForRecording(
  severity: string,
  minSeverity: string
): boolean {
  const levels = ['low', 'medium', 'high', 'critical'];
  return levels.indexOf(severity) >= levels.indexOf(minSeverity);
}
