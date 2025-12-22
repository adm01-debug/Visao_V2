import { logger } from "@/lib";
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useSettings
 * 
 * Gerencia todas as configurações do sistema
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

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

// ============================================
// VALORES PADRÃO
// ============================================

export const defaultGeneralSettings: GeneralSettings = {
  systemName: 'VISÃO',
  timezone: 'America/Sao_Paulo',
  language: 'pt-BR',
  theme: 'dark',
  soundEnabled: true,
  autoRefresh: true,
  refreshInterval: 30000,
  compactMode: false,
  showTips: true,
};

export const defaultNotificationSettings: NotificationSettings = {
  enabled: true,
  channels: ['push', 'sound'],
  emailRecipients: [],
  whatsappNumbers: [],
  telegramChatIds: [],
  webhookUrl: '',
  severityFilter: ['high', 'critical'],
  typeFilter: [],
  cooldownMinutes: 5,
  scheduleEnabled: false,
  scheduleStart: '08:00',
  scheduleEnd: '22:00',
  scheduleDays: [1, 2, 3, 4, 5],
  soundVolume: 80,
  soundFile: 'alert.mp3',
};

export const defaultAnalysisSettings: AnalysisSettings = {
  enabled: true,
  defaultInterval: 5000,
  analysisTypes: ['security', 'people'],
  saveHistory: true,
  maxHistoryDays: 30,
  createAlerts: true,
  minConfidence: 0.7,
  maxConcurrentAnalyses: 4,
  priorityCameras: [],
};

export const defaultFaceRecognitionSettings: FaceRecognitionSettings = {
  enabled: true,
  matchThreshold: 0.6,
  minFaceQuality: 0.5,
  minFaceSize: 80,
  detectMultipleFaces: true,
  maxFacesPerFrame: 10,
  alertOnUnknown: false,
  alertOnBlacklist: true,
  saveUnknownFaces: true,
  alertCooldown: 60,
  liveDetection: false,
};

export const defaultRecordingSettings: RecordingSettings = {
  enabled: true,
  autoRecordOnAlert: true,
  autoRecordOnMotion: false,
  defaultDuration: 30,
  maxDuration: 300,
  quality: 'medium',
  format: 'webm',
  retentionDays: 30,
  maxStorageMB: 5000,
};

export const defaultSecuritySettings: SecuritySettings = {
  requireAuth: true,
  sessionTimeout: 3600,
  maxLoginAttempts: 5,
  lockoutDuration: 300,
  ipWhitelist: [],
  auditLogEnabled: true,
  auditLogRetentionDays: 90,
};

// ============================================
// HOOK PRINCIPAL
// ============================================

interface UseSettingsOptions {
  autoLoad?: boolean;
  syncTabs?: boolean;
}

interface UseSettingsReturn {
  settings: AllSettings;
  loading: boolean;
  saving: boolean;
  error: string | null;
  
  general: GeneralSettings;
  notifications: NotificationSettings;
  analysis: AnalysisSettings;
  faceRecognition: FaceRecognitionSettings;
  recording: RecordingSettings;
  security: SecuritySettings;
  
  setGeneral: (settings: Partial<GeneralSettings>) => void;
  setNotifications: (settings: Partial<NotificationSettings>) => void;
  setAnalysis: (settings: Partial<AnalysisSettings>) => void;
  setFaceRecognition: (settings: Partial<FaceRecognitionSettings>) => void;
  setRecording: (settings: Partial<RecordingSettings>) => void;
  setSecurity: (settings: Partial<SecuritySettings>) => void;
  
  load: () => Promise<void>;
  save: () => Promise<boolean>;
  saveSection: (section: keyof AllSettings) => Promise<boolean>;
  reset: (section?: keyof AllSettings) => void;
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
}

export function useSettings(options: UseSettingsOptions = {}): UseSettingsReturn {
  const { autoLoad = true, syncTabs = true } = options;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [general, setGeneralState] = useState<GeneralSettings>(defaultGeneralSettings);
  const [notifications, setNotificationsState] = useState<NotificationSettings>(defaultNotificationSettings);
  const [analysis, setAnalysisState] = useState<AnalysisSettings>(defaultAnalysisSettings);
  const [faceRecognition, setFaceRecognitionState] = useState<FaceRecognitionSettings>(defaultFaceRecognitionSettings);
  const [recording, setRecordingState] = useState<RecordingSettings>(defaultRecordingSettings);
  const [security, setSecurityState] = useState<SecuritySettings>(defaultSecuritySettings);

  // Carregar configurações
  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Carregar do Supabase (apenas tabelas que existem)
      const [notifRes, faceRes] = await Promise.all([
        supabase.from('notification_configs').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('face_recognition_configs').select('*').eq('user_id', user.id).is('camera_id', null).maybeSingle(),
      ]);

      // Mapear notification_configs
      if (notifRes.data) {
        const data = notifRes.data;
        setNotificationsState({
          enabled: data.enabled ?? true,
          channels: (data.channels || ['push', 'sound']) as NotificationSettings['channels'],
          emailRecipients: data.email_recipients || [],
          whatsappNumbers: data.phone_recipients || [],
          telegramChatIds: [],
          webhookUrl: data.webhook_urls?.[0] || '',
          severityFilter: (data.severity_filter || ['high', 'critical']) as NotificationSettings['severityFilter'],
          typeFilter: [],
          cooldownMinutes: data.cooldown_minutes || 5,
          scheduleEnabled: data.schedule_enabled || false,
          scheduleStart: data.schedule_start_time || '08:00',
          scheduleEnd: data.schedule_end_time || '22:00',
          scheduleDays: data.schedule_days || [1, 2, 3, 4, 5],
          soundVolume: 80,
          soundFile: 'alert.mp3',
        });
      }

      // Mapear face_recognition_configs
      if (faceRes.data) {
        const data = faceRes.data;
        setFaceRecognitionState({
          enabled: data.enabled ?? true,
          matchThreshold: Number(data.match_threshold) || 0.6,
          minFaceQuality: Number(data.min_face_quality) || 0.5,
          minFaceSize: data.min_face_size || 80,
          detectMultipleFaces: data.detect_multiple_faces ?? true,
          maxFacesPerFrame: data.max_faces_per_frame || 10,
          alertOnUnknown: data.alert_on_unknown || false,
          alertOnBlacklist: true,
          saveUnknownFaces: data.save_unknown_faces ?? true,
          alertCooldown: data.alert_cooldown || 60,
          liveDetection: false,
        });
      }

      // Carregar do localStorage
      const savedGeneral = localStorage.getItem('visao-settings-general');
      if (savedGeneral) {
        try {
          setGeneralState(prev => ({ ...prev, ...JSON.parse(savedGeneral) }));
        } catch (e) {
          console.warn('Erro ao parsear settings general:', e);
        }
      }

      const savedAnalysis = localStorage.getItem('visao-settings-analysis');
      if (savedAnalysis) {
        try {
          setAnalysisState(prev => ({ ...prev, ...JSON.parse(savedAnalysis) }));
        } catch (e) {
          console.warn('Erro ao parsear settings analysis:', e);
        }
      }

      const savedRecording = localStorage.getItem('visao-settings-recording');
      if (savedRecording) {
        try {
          setRecordingState(prev => ({ ...prev, ...JSON.parse(savedRecording) }));
        } catch (e) {
          console.warn('Erro ao parsear settings recording:', e);
        }
      }

      const savedSecurity = localStorage.getItem('visao-settings-security');
      if (savedSecurity) {
        try {
          setSecurityState(prev => ({ ...prev, ...JSON.parse(savedSecurity) }));
        } catch (e) {
          console.warn('Erro ao parsear settings security:', e);
        }
      }

    } catch (err) {
      console.error('[useSettings] Erro ao carregar:', err);
      setError('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Salvar configurações
  const save = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return false;
    }

    setSaving(true);
    setError(null);

    try {
      // Salvar notification_configs
      await supabase.from('notification_configs').upsert({
        user_id: user.id,
        name: 'Configuração Principal',
        enabled: notifications.enabled,
        channels: notifications.channels,
        email_recipients: notifications.emailRecipients,
        phone_recipients: notifications.whatsappNumbers,
        webhook_urls: notifications.webhookUrl ? [notifications.webhookUrl] : [],
        severity_filter: notifications.severityFilter,
        cooldown_minutes: notifications.cooldownMinutes,
        schedule_enabled: notifications.scheduleEnabled,
        schedule_start_time: notifications.scheduleStart,
        schedule_end_time: notifications.scheduleEnd,
        schedule_days: notifications.scheduleDays,
      });

      // Salvar face_recognition_configs
      await supabase.from('face_recognition_configs').upsert({
        user_id: user.id,
        camera_id: null,
        enabled: faceRecognition.enabled,
        match_threshold: faceRecognition.matchThreshold,
        min_face_quality: faceRecognition.minFaceQuality,
        min_face_size: faceRecognition.minFaceSize,
        detect_multiple_faces: faceRecognition.detectMultipleFaces,
        max_faces_per_frame: faceRecognition.maxFacesPerFrame,
        alert_on_unknown: faceRecognition.alertOnUnknown,
        save_unknown_faces: faceRecognition.saveUnknownFaces,
        alert_cooldown: faceRecognition.alertCooldown,
      });

      // Salvar no localStorage
      localStorage.setItem('visao-settings-general', JSON.stringify(general));
      localStorage.setItem('visao-settings-analysis', JSON.stringify(analysis));
      localStorage.setItem('visao-settings-recording', JSON.stringify(recording));
      localStorage.setItem('visao-settings-security', JSON.stringify(security));

      if (syncTabs) {
        window.dispatchEvent(new CustomEvent('visao-settings-updated', { 
          detail: { timestamp: Date.now() } 
        }));
      }

      toast.success('Configurações salvas com sucesso!');
      return true;

    } catch (err) {
      console.error('[useSettings] Erro ao salvar:', err);
      setError('Erro ao salvar configurações');
      toast.error('Erro ao salvar configurações');
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, general, notifications, analysis, faceRecognition, recording, security, syncTabs]);

  const saveSection = useCallback(async (_section: keyof AllSettings): Promise<boolean> => {
    return save();
  }, [save]);

  // Setters parciais
  const setGeneral = useCallback((updates: Partial<GeneralSettings>) => {
    setGeneralState(prev => ({ ...prev, ...updates }));
  }, []);

  const setNotifications = useCallback((updates: Partial<NotificationSettings>) => {
    setNotificationsState(prev => ({ ...prev, ...updates }));
  }, []);

  const setAnalysis = useCallback((updates: Partial<AnalysisSettings>) => {
    setAnalysisState(prev => ({ ...prev, ...updates }));
  }, []);

  const setFaceRecognition = useCallback((updates: Partial<FaceRecognitionSettings>) => {
    setFaceRecognitionState(prev => ({ ...prev, ...updates }));
  }, []);

  const setRecording = useCallback((updates: Partial<RecordingSettings>) => {
    setRecordingState(prev => ({ ...prev, ...updates }));
  }, []);

  const setSecurity = useCallback((updates: Partial<SecuritySettings>) => {
    setSecurityState(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset
  const reset = useCallback((section?: keyof AllSettings) => {
    if (!section) {
      setGeneralState(defaultGeneralSettings);
      setNotificationsState(defaultNotificationSettings);
      setAnalysisState(defaultAnalysisSettings);
      setFaceRecognitionState(defaultFaceRecognitionSettings);
      setRecordingState(defaultRecordingSettings);
      setSecurityState(defaultSecuritySettings);
    } else {
      switch (section) {
        case 'general': setGeneralState(defaultGeneralSettings); break;
        case 'notifications': setNotificationsState(defaultNotificationSettings); break;
        case 'analysis': setAnalysisState(defaultAnalysisSettings); break;
        case 'faceRecognition': setFaceRecognitionState(defaultFaceRecognitionSettings); break;
        case 'recording': setRecordingState(defaultRecordingSettings); break;
        case 'security': setSecurityState(defaultSecuritySettings); break;
      }
    }
  }, []);

  // Export
  const exportSettings = useCallback((): string => {
    return JSON.stringify({
      general,
      notifications,
      analysis,
      faceRecognition,
      recording,
      security,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }, [general, notifications, analysis, faceRecognition, recording, security]);

  // Import
  const importSettings = useCallback((json: string): boolean => {
    try {
      const data = JSON.parse(json);
      
      if (data.general) setGeneralState(prev => ({ ...prev, ...data.general }));
      if (data.notifications) setNotificationsState(prev => ({ ...prev, ...data.notifications }));
      if (data.analysis) setAnalysisState(prev => ({ ...prev, ...data.analysis }));
      if (data.faceRecognition) setFaceRecognitionState(prev => ({ ...prev, ...data.faceRecognition }));
      if (data.recording) setRecordingState(prev => ({ ...prev, ...data.recording }));
      if (data.security) setSecurityState(prev => ({ ...prev, ...data.security }));

      toast.success('Configurações importadas com sucesso!');
      return true;
    } catch (err) {
      console.error('[useSettings] Erro ao importar:', err);
      toast.error('Formato de arquivo inválido');
      return false;
    }
  }, []);

  // Settings combinadas
  const settings = useMemo((): AllSettings => ({
    general,
    notifications,
    analysis,
    faceRecognition,
    recording,
    security,
  }), [general, notifications, analysis, faceRecognition, recording, security]);

  // Sync entre tabs
  useEffect(() => {
    if (!syncTabs) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('visao-settings-')) {
        load();
      }
    };

    const handleCustomEvent = () => {
      load();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('visao-settings-updated', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('visao-settings-updated', handleCustomEvent);
    };
  }, [syncTabs, load]);

  // Auto-load
  useEffect(() => {
    if (autoLoad) {
      load();
    }
  }, [autoLoad, load]);

  return {
    settings,
    loading,
    saving,
    error,
    general,
    notifications,
    analysis,
    faceRecognition,
    recording,
    security,
    setGeneral,
    setNotifications,
    setAnalysis,
    setFaceRecognition,
    setRecording,
    setSecurity,
    load,
    save,
    saveSection,
    reset,
    exportSettings,
    importSettings,
  };
}

export default useSettings;
