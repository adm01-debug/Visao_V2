/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useSettings
 * 
 * Gerencia todas as configurações do sistema com persistência:
 * - Supabase para configs críticas (notifications, face recognition, analysis)
 * - LocalStorage para preferências de UI
 * - Realtime sync entre tabs
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
  
  // Getters individuais
  general: GeneralSettings;
  notifications: NotificationSettings;
  analysis: AnalysisSettings;
  faceRecognition: FaceRecognitionSettings;
  recording: RecordingSettings;
  security: SecuritySettings;
  
  // Setters individuais
  setGeneral: (settings: Partial<GeneralSettings>) => void;
  setNotifications: (settings: Partial<NotificationSettings>) => void;
  setAnalysis: (settings: Partial<AnalysisSettings>) => void;
  setFaceRecognition: (settings: Partial<FaceRecognitionSettings>) => void;
  setRecording: (settings: Partial<RecordingSettings>) => void;
  setSecurity: (settings: Partial<SecuritySettings>) => void;
  
  // Ações
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
    if (!user) return;
    
    setLoading(true);
    setError(null);

    try {
      // Carregar do Supabase
      const [notifRes, faceRes, analysisRes, recordingRes] = await Promise.all([
        supabase.from('notification_configs').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('face_recognition_configs').select('*').eq('user_id', user.id).is('camera_id', null).maybeSingle(),
        supabase.from('continuous_analysis_configs').select('*').eq('user_id', user.id).is('camera_id', null).maybeSingle(),
        supabase.from('recording_configs').select('*').eq('user_id', user.id).is('camera_id', null).maybeSingle(),
      ]);

      // Mapear notification_configs
      if (notifRes.data) {
        setNotificationsState({
          enabled: notifRes.data.enabled ?? true,
          channels: notifRes.data.channels || ['push', 'sound'],
          emailRecipients: notifRes.data.email_recipients || [],
          whatsappNumbers: notifRes.data.phone_recipients || [],
          telegramChatIds: notifRes.data.telegram_chat_ids || [],
          webhookUrl: notifRes.data.webhook_urls?.[0] || '',
          severityFilter: notifRes.data.severity_filter || ['high', 'critical'],
          typeFilter: notifRes.data.type_filter || [],
          cooldownMinutes: notifRes.data.cooldown_minutes || 5,
          scheduleEnabled: notifRes.data.schedule_enabled || false,
          scheduleStart: notifRes.data.schedule_start_time || '08:00',
          scheduleEnd: notifRes.data.schedule_end_time || '22:00',
          scheduleDays: notifRes.data.schedule_days || [1, 2, 3, 4, 5],
          soundVolume: notifRes.data.sound_volume || 80,
          soundFile: notifRes.data.sound_file || 'alert.mp3',
        });
      }

      // Mapear face_recognition_configs
      if (faceRes.data) {
        setFaceRecognitionState({
          enabled: faceRes.data.enabled ?? true,
          matchThreshold: faceRes.data.match_threshold || 0.6,
          minFaceQuality: faceRes.data.min_face_quality || 0.5,
          minFaceSize: faceRes.data.min_face_size || 80,
          detectMultipleFaces: faceRes.data.detect_multiple_faces ?? true,
          maxFacesPerFrame: faceRes.data.max_faces_per_frame || 10,
          alertOnUnknown: faceRes.data.alert_on_unknown || false,
          alertOnBlacklist: faceRes.data.alert_on_blacklist ?? true,
          saveUnknownFaces: faceRes.data.save_unknown_faces ?? true,
          alertCooldown: faceRes.data.alert_cooldown || 60,
          liveDetection: faceRes.data.live_detection || false,
        });
      }

      // Mapear continuous_analysis_configs
      if (analysisRes.data) {
        setAnalysisState({
          enabled: analysisRes.data.enabled ?? true,
          defaultInterval: analysisRes.data.interval_ms || 5000,
          analysisTypes: analysisRes.data.analysis_types || ['security', 'people'],
          saveHistory: analysisRes.data.save_history ?? true,
          maxHistoryDays: analysisRes.data.max_history_days || 30,
          createAlerts: analysisRes.data.create_alerts ?? true,
          minConfidence: analysisRes.data.min_confidence || 0.7,
          maxConcurrentAnalyses: analysisRes.data.max_concurrent || 4,
          priorityCameras: analysisRes.data.priority_cameras || [],
        });
      }

      // Mapear recording_configs
      if (recordingRes.data) {
        setRecordingState({
          enabled: recordingRes.data.enabled ?? true,
          autoRecordOnAlert: recordingRes.data.auto_record_on_alert ?? true,
          autoRecordOnMotion: recordingRes.data.auto_record_on_motion || false,
          defaultDuration: recordingRes.data.default_duration || 30,
          maxDuration: recordingRes.data.max_duration || 300,
          quality: recordingRes.data.quality || 'medium',
          format: recordingRes.data.format || 'webm',
          retentionDays: recordingRes.data.retention_days || 30,
          maxStorageMB: recordingRes.data.max_storage_mb || 5000,
        });
      }

      // Carregar do localStorage
      const savedGeneral = localStorage.getItem('visao-settings-general');
      if (savedGeneral) {
        setGeneralState(prev => ({ ...prev, ...JSON.parse(savedGeneral) }));
      }

      const savedSecurity = localStorage.getItem('visao-settings-security');
      if (savedSecurity) {
        setSecurityState(prev => ({ ...prev, ...JSON.parse(savedSecurity) }));
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
        telegram_chat_ids: notifications.telegramChatIds,
        webhook_urls: notifications.webhookUrl ? [notifications.webhookUrl] : [],
        severity_filter: notifications.severityFilter,
        type_filter: notifications.typeFilter,
        cooldown_minutes: notifications.cooldownMinutes,
        schedule_enabled: notifications.scheduleEnabled,
        schedule_start_time: notifications.scheduleStart,
        schedule_end_time: notifications.scheduleEnd,
        schedule_days: notifications.scheduleDays,
        sound_volume: notifications.soundVolume,
        sound_file: notifications.soundFile,
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
        alert_on_blacklist: faceRecognition.alertOnBlacklist,
        save_unknown_faces: faceRecognition.saveUnknownFaces,
        alert_cooldown: faceRecognition.alertCooldown,
        live_detection: faceRecognition.liveDetection,
      });

      // Salvar continuous_analysis_configs
      await supabase.from('continuous_analysis_configs').upsert({
        user_id: user.id,
        camera_id: null,
        enabled: analysis.enabled,
        interval_ms: analysis.defaultInterval,
        analysis_types: analysis.analysisTypes,
        save_history: analysis.saveHistory,
        max_history_days: analysis.maxHistoryDays,
        create_alerts: analysis.createAlerts,
        min_confidence: analysis.minConfidence,
        max_concurrent: analysis.maxConcurrentAnalyses,
        priority_cameras: analysis.priorityCameras,
      });

      // Salvar recording_configs
      await supabase.from('recording_configs').upsert({
        user_id: user.id,
        camera_id: null,
        enabled: recording.enabled,
        auto_record_on_alert: recording.autoRecordOnAlert,
        auto_record_on_motion: recording.autoRecordOnMotion,
        default_duration: recording.defaultDuration,
        max_duration: recording.maxDuration,
        quality: recording.quality,
        format: recording.format,
        retention_days: recording.retentionDays,
        max_storage_mb: recording.maxStorageMB,
      });

      // Salvar no localStorage
      localStorage.setItem('visao-settings-general', JSON.stringify(general));
      localStorage.setItem('visao-settings-security', JSON.stringify(security));

      // Broadcast para outras tabs
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

  // Salvar seção específica
  const saveSection = useCallback(async (section: keyof AllSettings): Promise<boolean> => {
    // Implementar salvamento por seção se necessário
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
    toast.info('Configurações restauradas para o padrão');
  }, []);

  // Export/Import
  const exportSettings = useCallback((): string => {
    return JSON.stringify({
      general,
      notifications,
      analysis,
      faceRecognition,
      recording,
      security,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    }, null, 2);
  }, [general, notifications, analysis, faceRecognition, recording, security]);

  const importSettings = useCallback((json: string): boolean => {
    try {
      const data = JSON.parse(json);
      if (data.general) setGeneralState(data.general);
      if (data.notifications) setNotificationsState(data.notifications);
      if (data.analysis) setAnalysisState(data.analysis);
      if (data.faceRecognition) setFaceRecognitionState(data.faceRecognition);
      if (data.recording) setRecordingState(data.recording);
      if (data.security) setSecurityState(data.security);
      toast.success('Configurações importadas com sucesso!');
      return true;
    } catch (err) {
      toast.error('Erro ao importar configurações');
      return false;
    }
  }, []);

  // Auto load
  useEffect(() => {
    if (autoLoad && user) {
      load();
    }
  }, [autoLoad, user, load]);

  // Sync between tabs
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

  // Objeto settings agregado
  const settings = useMemo<AllSettings>(() => ({
    general,
    notifications,
    analysis,
    faceRecognition,
    recording,
    security,
  }), [general, notifications, analysis, faceRecognition, recording, security]);

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
