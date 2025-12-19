/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Tipos para Reconhecimento Facial (GAP #4)
 * 
 * Define estruturas para:
 * - Cadastro de pessoas
 * - Detecção de faces
 * - Matching e identificação
 * - Listas de acesso (whitelist/blacklist)
 * - Logs de reconhecimento
 */

// ============================================
// PESSOA CADASTRADA
// ============================================

/** Status da pessoa no sistema */
export type PersonStatus = 
  | 'active'      // Ativo no sistema
  | 'inactive'    // Inativo (temporário)
  | 'blocked'     // Bloqueado
  | 'pending';    // Aguardando aprovação

/** Tipo de lista */
export type ListType = 
  | 'whitelist'   // Permitido
  | 'blacklist'   // Bloqueado/Alerta
  | 'vip'         // VIP/Prioridade
  | 'employee'    // Funcionário
  | 'visitor'     // Visitante
  | 'contractor'  // Terceiro
  | 'unknown';    // Desconhecido

/** Pessoa cadastrada no sistema */
export interface Person {
  /** ID único */
  id: string;
  
  /** Nome completo */
  name: string;
  
  /** Documento (CPF, RG, etc) */
  document?: string;
  
  /** Tipo de documento */
  documentType?: 'cpf' | 'rg' | 'passport' | 'other';
  
  /** Email */
  email?: string;
  
  /** Telefone */
  phone?: string;
  
  /** Empresa/Organização */
  company?: string;
  
  /** Departamento */
  department?: string;
  
  /** Cargo */
  role?: string;
  
  /** Tipo de lista */
  listType: ListType;
  
  /** Status */
  status: PersonStatus;
  
  /** Foto principal (URL) */
  photoUrl?: string;
  
  /** Fotos para treinamento (URLs) */
  trainingPhotos: string[];
  
  /** Encoding facial (vetor de características) */
  faceEncoding?: number[];
  
  /** Qualidade do encoding (0-1) */
  encodingQuality?: number;
  
  /** Tags para organização */
  tags?: string[];
  
  /** Notas */
  notes?: string;
  
  /** Horário de acesso permitido */
  accessSchedule?: {
    enabled: boolean;
    startTime: string; // HH:mm
    endTime: string;
    days: number[]; // 0-6
  };
  
  /** Áreas/Câmeras permitidas */
  allowedCameras?: string[];
  
  /** Último reconhecimento */
  lastSeenAt?: Date;
  lastSeenCameraId?: string;
  lastSeenCameraName?: string;
  
  /** Contagem de reconhecimentos */
  recognitionCount: number;
  
  /** Criado em */
  createdAt: Date;
  
  /** Atualizado em */
  updatedAt: Date;
  
  /** Criado por */
  createdBy?: string;
}

// ============================================
// FACE DETECTADA
// ============================================

/** Face detectada em uma imagem/frame */
export interface DetectedFace {
  /** ID único da detecção */
  id: string;
  
  /** Bounding box (percentuais 0-100) */
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  /** Confiança da detecção (0-1) */
  confidence: number;
  
  /** Landmarks faciais */
  landmarks?: {
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    nose: { x: number; y: number };
    leftMouth: { x: number; y: number };
    rightMouth: { x: number; y: number };
  };
  
  /** Encoding facial (vetor para matching) */
  encoding?: number[];
  
  /** Qualidade da face (0-1) */
  quality: number;
  
  /** Atributos estimados */
  attributes?: {
    age?: number;
    gender?: 'male' | 'female' | 'unknown';
    emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'fear';
    glasses?: boolean;
    mask?: boolean;
    beard?: boolean;
  };
  
  /** Pose da cabeça */
  pose?: {
    yaw: number;   // Rotação horizontal
    pitch: number; // Rotação vertical
    roll: number;  // Inclinação
  };
  
  /** Imagem recortada da face (base64) */
  croppedImage?: string;
  
  /** Timestamp da detecção */
  timestamp: Date;
}

// ============================================
// RESULTADO DO MATCHING
// ============================================

/** Resultado de comparação com pessoa cadastrada */
export interface FaceMatch {
  /** ID da pessoa */
  personId: string;
  
  /** Nome da pessoa */
  personName: string;
  
  /** Foto da pessoa */
  personPhoto?: string;
  
  /** Tipo de lista */
  listType: ListType;
  
  /** Similaridade (0-1) */
  similarity: number;
  
  /** É match positivo? (acima do threshold) */
  isMatch: boolean;
  
  /** Distância do encoding */
  distance: number;
}

/** Resultado completo de reconhecimento */
export interface RecognitionResult {
  /** Face detectada */
  face: DetectedFace;
  
  /** Matches encontrados (ordenados por similaridade) */
  matches: FaceMatch[];
  
  /** Melhor match (se houver) */
  bestMatch?: FaceMatch;
  
  /** É pessoa conhecida? */
  isKnown: boolean;
  
  /** Ação recomendada */
  action: 'allow' | 'alert' | 'block' | 'log' | 'none';
  
  /** Mensagem */
  message?: string;
  
  /** Deve gerar alerta? */
  shouldAlert: boolean;
  
  /** Severidade do alerta */
  alertSeverity?: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================
// CONFIGURAÇÃO DE RECONHECIMENTO
// ============================================

export interface FaceRecognitionConfig {
  /** ID da configuração */
  id: string;
  
  /** ID da câmera (null = global) */
  cameraId?: string;
  
  /** Habilitado */
  enabled: boolean;
  
  /** Threshold de similaridade (0-1) */
  matchThreshold: number;
  
  /** Threshold de qualidade mínima da face */
  minFaceQuality: number;
  
  /** Tamanho mínimo da face (pixels) */
  minFaceSize: number;
  
  /** Detectar múltiplas faces */
  detectMultipleFaces: boolean;
  
  /** Máximo de faces por frame */
  maxFacesPerFrame: number;
  
  /** Ações por tipo de lista */
  actions: {
    whitelist: 'allow' | 'log';
    blacklist: 'alert' | 'block';
    vip: 'allow' | 'notify';
    employee: 'allow' | 'log';
    visitor: 'log' | 'alert';
    unknown: 'log' | 'alert' | 'ignore';
  };
  
  /** Alertar para desconhecidos */
  alertOnUnknown: boolean;
  
  /** Intervalo mínimo entre alertas (segundos) */
  alertCooldown: number;
  
  /** Salvar faces desconhecidas */
  saveUnknownFaces: boolean;
  
  /** Verificar horário de acesso */
  checkAccessSchedule: boolean;
  
  /** Verificar câmeras permitidas */
  checkAllowedCameras: boolean;
}

/** Configuração padrão */
export const defaultFaceRecognitionConfig: FaceRecognitionConfig = {
  id: '',
  enabled: true,
  matchThreshold: 0.6,
  minFaceQuality: 0.5,
  minFaceSize: 80,
  detectMultipleFaces: true,
  maxFacesPerFrame: 10,
  actions: {
    whitelist: 'allow',
    blacklist: 'alert',
    vip: 'notify',
    employee: 'log',
    visitor: 'log',
    unknown: 'log',
  },
  alertOnUnknown: false,
  alertCooldown: 60,
  saveUnknownFaces: true,
  checkAccessSchedule: false,
  checkAllowedCameras: false,
};

// ============================================
// LOG DE RECONHECIMENTO
// ============================================

export interface RecognitionLog {
  /** ID do log */
  id: string;
  
  /** ID da câmera */
  cameraId: string;
  
  /** Nome da câmera */
  cameraName: string;
  
  /** ID da pessoa (se reconhecida) */
  personId?: string;
  
  /** Nome da pessoa */
  personName?: string;
  
  /** Tipo de lista */
  listType?: ListType;
  
  /** Similaridade */
  similarity?: number;
  
  /** É pessoa conhecida */
  isKnown: boolean;
  
  /** Ação tomada */
  action: string;
  
  /** Snapshot da face */
  faceSnapshot?: string;
  
  /** Snapshot do frame completo */
  frameSnapshot?: string;
  
  /** Bounding box */
  boundingBox?: DetectedFace['boundingBox'];
  
  /** Atributos da face */
  attributes?: DetectedFace['attributes'];
  
  /** Gerou alerta? */
  alertGenerated: boolean;
  
  /** ID do alerta (se gerado) */
  alertId?: string;
  
  /** Timestamp */
  timestamp: Date;
}

// ============================================
// EVENTOS
// ============================================

export interface FaceRecognitionEvents {
  /** Face detectada */
  onFaceDetected?: (face: DetectedFace, cameraId: string) => void;
  
  /** Pessoa reconhecida */
  onPersonRecognized?: (result: RecognitionResult, cameraId: string) => void;
  
  /** Pessoa desconhecida */
  onUnknownPerson?: (face: DetectedFace, cameraId: string) => void;
  
  /** Alerta gerado */
  onAlert?: (result: RecognitionResult, cameraId: string) => void;
  
  /** Acesso negado */
  onAccessDenied?: (result: RecognitionResult, cameraId: string, reason: string) => void;
  
  /** VIP detectado */
  onVIPDetected?: (result: RecognitionResult, cameraId: string) => void;
  
  /** Blacklist detectado */
  onBlacklistDetected?: (result: RecognitionResult, cameraId: string) => void;
  
  /** Erro no reconhecimento */
  onError?: (error: Error, cameraId: string) => void;
}

// ============================================
// ESTATÍSTICAS
// ============================================

export interface FaceRecognitionStats {
  /** Total de faces detectadas */
  totalDetections: number;
  
  /** Pessoas reconhecidas */
  recognizedCount: number;
  
  /** Pessoas desconhecidas */
  unknownCount: number;
  
  /** Alertas gerados */
  alertsGenerated: number;
  
  /** Por tipo de lista */
  byListType: Record<ListType, number>;
  
  /** Por câmera */
  byCamera: Record<string, number>;
  
  /** Taxa de reconhecimento */
  recognitionRate: number;
  
  /** Tempo médio de processamento (ms) */
  avgProcessingTime: number;
}

// ============================================
// HELPERS
// ============================================

/**
 * Calcula similaridade entre dois encodings faciais
 * Usando distância euclidiana normalizada
 */
export function calculateSimilarity(
  encoding1: number[],
  encoding2: number[]
): number {
  if (encoding1.length !== encoding2.length) return 0;
  
  let sumSquares = 0;
  for (let i = 0; i < encoding1.length; i++) {
    sumSquares += Math.pow(encoding1[i] - encoding2[i], 2);
  }
  
  const distance = Math.sqrt(sumSquares);
  // Converter distância para similaridade (0-1)
  // Assumindo distância máxima de ~1.5 para faces diferentes
  const similarity = Math.max(0, 1 - (distance / 1.5));
  
  return similarity;
}

/**
 * Verifica se a face atende qualidade mínima
 */
export function meetsQualityThreshold(
  face: DetectedFace,
  config: FaceRecognitionConfig
): boolean {
  if (face.quality < config.minFaceQuality) return false;
  if (face.confidence < 0.8) return false;
  
  // Verificar tamanho mínimo
  const faceWidth = face.boundingBox.width;
  const faceHeight = face.boundingBox.height;
  const minSize = config.minFaceSize;
  
  // Assumindo imagem 1920x1080, converter percentual para pixels
  const pixelWidth = (faceWidth / 100) * 1920;
  const pixelHeight = (faceHeight / 100) * 1080;
  
  if (pixelWidth < minSize || pixelHeight < minSize) return false;
  
  // Verificar pose (se disponível)
  if (face.pose) {
    const { yaw, pitch } = face.pose;
    // Rejeitar faces muito inclinadas
    if (Math.abs(yaw) > 45 || Math.abs(pitch) > 30) return false;
  }
  
  return true;
}

/**
 * Determina ação baseado no tipo de lista e config
 */
export function determineAction(
  listType: ListType,
  config: FaceRecognitionConfig
): 'allow' | 'alert' | 'block' | 'log' | 'none' {
  const action = config.actions[listType];
  
  switch (action) {
    case 'allow': return 'allow';
    case 'alert': return 'alert';
    case 'block': return 'block';
    case 'log': return 'log';
    case 'notify': return 'alert';
    case 'ignore': return 'none';
    default: return 'log';
  }
}

/**
 * Verifica se pessoa está dentro do horário de acesso
 */
export function isWithinAccessSchedule(person: Person): boolean {
  if (!person.accessSchedule?.enabled) return true;
  
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5);
  
  if (!person.accessSchedule.days.includes(currentDay)) return false;
  
  const { startTime, endTime } = person.accessSchedule;
  
  if (startTime <= endTime) {
    return currentTime >= startTime && currentTime <= endTime;
  } else {
    return currentTime >= startTime || currentTime <= endTime;
  }
}

/**
 * Gera cor para tipo de lista
 */
export function getListTypeColor(listType: ListType): string {
  const colors: Record<ListType, string> = {
    whitelist: 'bg-green-500',
    blacklist: 'bg-red-500',
    vip: 'bg-yellow-500',
    employee: 'bg-blue-500',
    visitor: 'bg-purple-500',
    contractor: 'bg-orange-500',
    unknown: 'bg-gray-500',
  };
  return colors[listType];
}

/**
 * Gera label para tipo de lista
 */
export function getListTypeLabel(listType: ListType): string {
  const labels: Record<ListType, string> = {
    whitelist: 'Permitido',
    blacklist: 'Bloqueado',
    vip: 'VIP',
    employee: 'Funcionário',
    visitor: 'Visitante',
    contractor: 'Terceiro',
    unknown: 'Desconhecido',
  };
  return labels[listType];
}
