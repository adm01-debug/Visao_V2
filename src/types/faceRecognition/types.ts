/**
 * VISÃO - Face Recognition Types
 * Core type definitions for facial recognition system
 */

// ============================================
// ENUMS & BASE TYPES
// ============================================

export type PersonStatus = 'active' | 'inactive' | 'blocked' | 'pending';

export type ListType =
  'whitelist' | 'blacklist' | 'vip' | 'employee' | 'visitor' | 'contractor' | 'unknown';

// ============================================
// PESSOA CADASTRADA
// ============================================

export interface Person {
  id: string;
  name: string;
  document?: string;
  documentType?: 'cpf' | 'rg' | 'passport' | 'other';
  email?: string;
  phone?: string;
  company?: string;
  department?: string;
  role?: string;
  listType: ListType;
  status: PersonStatus;
  photoUrl?: string;
  trainingPhotos: string[];
  faceEncoding?: number[];
  encodingQuality?: number;
  tags?: string[];
  notes?: string;
  accessSchedule?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    days: number[];
  };
  allowedCameras?: string[];
  lastSeenAt?: Date;
  lastSeenCameraId?: string;
  lastSeenCameraName?: string;
  recognitionCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// ============================================
// FACE DETECTADA
// ============================================

export interface DetectedFace {
  id: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  confidence: number;
  landmarks?: {
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    nose: { x: number; y: number };
    leftMouth: { x: number; y: number };
    rightMouth: { x: number; y: number };
  };
  encoding?: number[];
  quality: number;
  attributes?: {
    age?: number;
    gender?: 'male' | 'female' | 'unknown';
    emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'fear';
    glasses?: boolean;
    mask?: boolean;
    beard?: boolean;
  };
  pose?: { yaw: number; pitch: number; roll: number };
  croppedImage?: string;
  timestamp: Date;
}

// ============================================
// MATCHING & RECOGNITION
// ============================================

export interface FaceMatch {
  personId: string;
  personName: string;
  personPhoto?: string;
  listType: ListType;
  similarity: number;
  isMatch: boolean;
  distance: number;
}

export interface RecognitionResult {
  face: DetectedFace;
  matches: FaceMatch[];
  bestMatch?: FaceMatch;
  isKnown: boolean;
  action: 'allow' | 'alert' | 'block' | 'log' | 'none';
  message?: string;
  shouldAlert: boolean;
  alertSeverity?: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================
// CONFIGURAÇÃO
// ============================================

export interface FaceRecognitionConfig {
  id: string;
  cameraId?: string;
  enabled: boolean;
  matchThreshold: number;
  minFaceQuality: number;
  minFaceSize: number;
  detectMultipleFaces: boolean;
  maxFacesPerFrame: number;
  actions: Record<ListType, 'allow' | 'alert' | 'block' | 'log' | 'notify' | 'ignore'>;
  alertOnUnknown: boolean;
  alertCooldown: number;
  saveUnknownFaces: boolean;
  checkAccessSchedule: boolean;
  checkAllowedCameras: boolean;
}

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
    contractor: 'log',
    unknown: 'log',
  },
  alertOnUnknown: false,
  alertCooldown: 60,
  saveUnknownFaces: true,
  checkAccessSchedule: false,
  checkAllowedCameras: false,
};

// ============================================
// LOG & EVENTS
// ============================================

export interface RecognitionLog {
  id: string;
  cameraId: string;
  cameraName: string;
  personId?: string;
  personName?: string;
  listType?: ListType;
  similarity?: number;
  isKnown: boolean;
  action: string;
  faceSnapshot?: string;
  frameSnapshot?: string;
  boundingBox?: DetectedFace['boundingBox'];
  attributes?: DetectedFace['attributes'];
  alertGenerated: boolean;
  alertId?: string;
  timestamp: Date;
}

export interface FaceRecognitionEvents {
  onFaceDetected?: (face: DetectedFace, cameraId: string) => void;
  onPersonRecognized?: (result: RecognitionResult, cameraId: string) => void;
  onUnknownPerson?: (face: DetectedFace, cameraId: string) => void;
  onAlert?: (result: RecognitionResult, cameraId: string) => void;
  onAccessDenied?: (result: RecognitionResult, cameraId: string, reason: string) => void;
  onVIPDetected?: (result: RecognitionResult, cameraId: string) => void;
  onBlacklistDetected?: (result: RecognitionResult, cameraId: string) => void;
  onError?: (error: Error, cameraId: string) => void;
}

// ============================================
// ESTATÍSTICAS
// ============================================

export interface FaceRecognitionStats {
  totalDetections: number;
  recognizedCount: number;
  unknownCount: number;
  alertsGenerated: number;
  byListType: Record<ListType, number>;
  byCamera: Record<string, number>;
  recognitionRate: number;
  avgProcessingTime: number;
}
