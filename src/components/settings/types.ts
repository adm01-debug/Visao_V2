export interface GeneralSettings {
  systemName: string;
  timezone: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  emailRecipients: string[];
  whatsappEnabled: boolean;
  whatsappNumbers: string[];
  webhookEnabled: boolean;
  webhookUrl: string;
  severityFilter: string[];
  cooldownMinutes: number;
  scheduleEnabled: boolean;
  scheduleStart: string;
  scheduleEnd: string;
  scheduleDays: number[];
}

export interface AnalysisSettings {
  analysisEnabled: boolean;
  defaultInterval: number;
  defaultTypes: string[];
  saveHistory: boolean;
  maxHistoryDays: number;
  createAlerts: boolean;
  minConfidence: number;
}

export interface FaceRecognitionSettings {
  enabled: boolean;
  matchThreshold: number;
  minFaceQuality: number;
  minFaceSize: number;
  detectMultipleFaces: boolean;
  maxFacesPerFrame: number;
  alertOnUnknown: boolean;
  saveUnknownFaces: boolean;
  alertCooldown: number;
}

export interface SystemStats {
  totalCameras: number;
  onlineCameras: number;
  totalAlerts: number;
  totalPersons: number;
  totalZones: number;
  storageUsed: number;
  storageTotal: number;
  dbSize: string;
  lastBackup?: string;
  uptime: string;
}
