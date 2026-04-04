/**
 * VISÃO - Settings Types & Defaults
 */

export interface GeneralSettings {
  systemName: string;
  timezone: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  compactMode: boolean;
  showTips: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  channels: ('email' | 'whatsapp' | 'webhook' | 'push' | 'sound')[];
  emailRecipients: string[];
  whatsappNumbers: string[];
  telegramChatIds: string[];
  webhookUrl: string;
  severityFilter: ('low' | 'medium' | 'high' | 'critical')[];
  typeFilter: string[];
  cooldownMinutes: number;
  scheduleEnabled: boolean;
  scheduleStart: string;
  scheduleEnd: string;
  scheduleDays: number[];
  soundVolume: number;
  soundFile: string;
}

export interface AnalysisSettings {
  enabled: boolean;
  defaultInterval: number;
  analysisTypes: string[];
  saveHistory: boolean;
  maxHistoryDays: number;
  createAlerts: boolean;
  minConfidence: number;
  maxConcurrentAnalyses: number;
  priorityCameras: string[];
}

export interface FaceRecognitionSettings {
  enabled: boolean;
  matchThreshold: number;
  minFaceQuality: number;
  minFaceSize: number;
  detectMultipleFaces: boolean;
  maxFacesPerFrame: number;
  alertOnUnknown: boolean;
  alertOnBlacklist: boolean;
  saveUnknownFaces: boolean;
  alertCooldown: number;
  liveDetection: boolean;
}

export interface RecordingSettings {
  enabled: boolean;
  autoRecordOnAlert: boolean;
  autoRecordOnMotion: boolean;
  defaultDuration: number;
  maxDuration: number;
  quality: 'low' | 'medium' | 'high';
  format: 'webm' | 'mp4';
  retentionDays: number;
  maxStorageMB: number;
}

export interface SecuritySettings {
  requireAuth: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  ipWhitelist: string[];
  auditLogEnabled: boolean;
  auditLogRetentionDays: number;
}

export interface AllSettings {
  general: GeneralSettings;
  notifications: NotificationSettings;
  analysis: AnalysisSettings;
  faceRecognition: FaceRecognitionSettings;
  recording: RecordingSettings;
  security: SecuritySettings;
}

export const defaultGeneralSettings: GeneralSettings = {
  systemName: 'VISÃO', timezone: 'America/Sao_Paulo', language: 'pt-BR',
  theme: 'dark', soundEnabled: true, autoRefresh: true, refreshInterval: 30000,
  compactMode: false, showTips: true,
};

export const defaultNotificationSettings: NotificationSettings = {
  enabled: true, channels: ['push', 'sound'], emailRecipients: [], whatsappNumbers: [],
  telegramChatIds: [], webhookUrl: '', severityFilter: ['high', 'critical'], typeFilter: [],
  cooldownMinutes: 5, scheduleEnabled: false, scheduleStart: '08:00', scheduleEnd: '22:00',
  scheduleDays: [1, 2, 3, 4, 5], soundVolume: 80, soundFile: 'alert.mp3',
};

export const defaultAnalysisSettings: AnalysisSettings = {
  enabled: true, defaultInterval: 5000, analysisTypes: ['security', 'people'],
  saveHistory: true, maxHistoryDays: 30, createAlerts: true, minConfidence: 0.7,
  maxConcurrentAnalyses: 4, priorityCameras: [],
};

export const defaultFaceRecognitionSettings: FaceRecognitionSettings = {
  enabled: true, matchThreshold: 0.6, minFaceQuality: 0.5, minFaceSize: 80,
  detectMultipleFaces: true, maxFacesPerFrame: 10, alertOnUnknown: false,
  alertOnBlacklist: true, saveUnknownFaces: true, alertCooldown: 60, liveDetection: false,
};

export const defaultRecordingSettings: RecordingSettings = {
  enabled: true, autoRecordOnAlert: true, autoRecordOnMotion: false,
  defaultDuration: 30, maxDuration: 300, quality: 'medium', format: 'webm',
  retentionDays: 30, maxStorageMB: 5000,
};

export const defaultSecuritySettings: SecuritySettings = {
  requireAuth: true, sessionTimeout: 3600, maxLoginAttempts: 5, lockoutDuration: 300,
  ipWhitelist: [], auditLogEnabled: true, auditLogRetentionDays: 90,
};
