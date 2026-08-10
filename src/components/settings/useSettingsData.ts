import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  GeneralSettings,
  NotificationSettings,
  AnalysisSettings,
  FaceRecognitionSettings,
  SystemStats,
} from './types';

const defaultGeneral: GeneralSettings = {
  systemName: 'VISÃO',
  timezone: 'America/Sao_Paulo',
  language: 'pt-BR',
  theme: 'dark',
  soundEnabled: true,
  autoRefresh: true,
  refreshInterval: 30000,
};

const defaultNotification: NotificationSettings = {
  emailEnabled: false,
  emailRecipients: [],
  whatsappEnabled: false,
  whatsappNumbers: [],
  webhookEnabled: false,
  webhookUrl: '',
  severityFilter: ['high', 'critical'],
  cooldownMinutes: 5,
  scheduleEnabled: false,
  scheduleStart: '08:00',
  scheduleEnd: '22:00',
  scheduleDays: [1, 2, 3, 4, 5],
};

const defaultAnalysis: AnalysisSettings = {
  analysisEnabled: true,
  defaultInterval: 5000,
  defaultTypes: ['security'],
  saveHistory: true,
  maxHistoryDays: 30,
  createAlerts: true,
  minConfidence: 0.7,
};

const defaultFace: FaceRecognitionSettings = {
  enabled: true,
  matchThreshold: 0.6,
  minFaceQuality: 0.5,
  minFaceSize: 80,
  detectMultipleFaces: true,
  maxFacesPerFrame: 10,
  alertOnUnknown: false,
  saveUnknownFaces: true,
  alertCooldown: 60,
};

export function useSettingsData() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmClearData, setConfirmClearData] = useState<string | null>(null);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(defaultGeneral);
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(defaultNotification);
  const [analysisSettings, setAnalysisSettings] = useState<AnalysisSettings>(defaultAnalysis);
  const [faceSettings, setFaceSettings] = useState<FaceRecognitionSettings>(defaultFace);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalCameras: 0,
    onlineCameras: 0,
    totalAlerts: 0,
    totalPersons: 0,
    totalZones: 0,
    storageUsed: 0,
    storageTotal: 100,
    dbSize: '0 MB',
    uptime: '0h',
  });
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data: notifConfig } = await supabase
        .from('notification_configs')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (notifConfig) {
        setNotificationSettings((prev) => ({
          ...prev,
          emailEnabled: notifConfig.channels?.includes('email') || false,
          emailRecipients: notifConfig.email_recipients || [],
          whatsappEnabled: notifConfig.channels?.includes('whatsapp') || false,
          whatsappNumbers: notifConfig.phone_recipients || [],
          webhookEnabled: notifConfig.channels?.includes('webhook') || false,
          webhookUrl: notifConfig.webhook_urls?.[0] || '',
          severityFilter: notifConfig.severity_filter || ['high', 'critical'],
          cooldownMinutes: notifConfig.cooldown_minutes || 5,
          scheduleEnabled: notifConfig.schedule_enabled || false,
          scheduleStart: notifConfig.schedule_start_time || '08:00',
          scheduleEnd: notifConfig.schedule_end_time || '22:00',
          scheduleDays: notifConfig.schedule_days || [1, 2, 3, 4, 5],
        }));
      }

      const { data: faceConfig } = await supabase
        .from('face_recognition_configs')
        .select('*')
        .is('camera_id', null)
        .maybeSingle();
      if (faceConfig) {
        setFaceSettings((prev) => ({
          ...prev,
          enabled: faceConfig.enabled,
          matchThreshold: faceConfig.match_threshold || 0.6,
          minFaceQuality: faceConfig.min_face_quality || 0.5,
          minFaceSize: faceConfig.min_face_size || 80,
          detectMultipleFaces: faceConfig.detect_multiple_faces ?? true,
          maxFacesPerFrame: faceConfig.max_faces_per_frame || 10,
          alertOnUnknown: faceConfig.alert_on_unknown || false,
          saveUnknownFaces: faceConfig.save_unknown_faces ?? true,
          alertCooldown: faceConfig.alert_cooldown || 60,
        }));
      }

      const [camerasRes, alertsRes, personsRes, zonesRes] = await Promise.all([
        supabase.from('cameras').select('id, status', { count: 'exact' }),
        supabase.from('alerts').select('id', { count: 'exact' }),
        supabase.from('registered_persons').select('id', { count: 'exact' }),
        supabase.from('zones').select('id', { count: 'exact' }),
      ]);
      setSystemStats({
        totalCameras: camerasRes.count || 0,
        onlineCameras: camerasRes.data?.filter((c) => c.status !== 'offline').length || 0,
        totalAlerts: alertsRes.count || 0,
        totalPersons: personsRes.count || 0,
        totalZones: zonesRes.count || 0,
        storageUsed: 45,
        storageTotal: 100,
        dbSize: '128 MB',
        uptime: '7d 4h 32m',
      });

      const savedGeneral = localStorage.getItem('visao-general-settings');
      if (savedGeneral) setGeneralSettings(JSON.parse(savedGeneral));
      const savedAnalysis = localStorage.getItem('visao-analysis-settings');
      if (savedAnalysis) setAnalysisSettings(JSON.parse(savedAnalysis));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        setSaving(false);
        return;
      }
      const channels: string[] = [];
      if (notificationSettings.emailEnabled) channels.push('email');
      if (notificationSettings.whatsappEnabled) channels.push('whatsapp');
      if (notificationSettings.webhookEnabled) channels.push('webhook');
      await supabase.from('notification_configs').upsert({
        user_id: user.id,
        name: 'Configuração Principal',
        enabled: channels.length > 0,
        channels,
        email_recipients: notificationSettings.emailRecipients,
        phone_recipients: notificationSettings.whatsappNumbers,
        webhook_urls: notificationSettings.webhookUrl ? [notificationSettings.webhookUrl] : [],
        severity_filter: notificationSettings.severityFilter,
        cooldown_minutes: notificationSettings.cooldownMinutes,
        schedule_enabled: notificationSettings.scheduleEnabled,
        schedule_start_time: notificationSettings.scheduleStart,
        schedule_end_time: notificationSettings.scheduleEnd,
        schedule_days: notificationSettings.scheduleDays,
      });
      await supabase.from('face_recognition_configs').upsert({
        user_id: user.id,
        camera_id: null,
        enabled: faceSettings.enabled,
        match_threshold: faceSettings.matchThreshold,
        min_face_quality: faceSettings.minFaceQuality,
        min_face_size: faceSettings.minFaceSize,
        detect_multiple_faces: faceSettings.detectMultipleFaces,
        max_faces_per_frame: faceSettings.maxFacesPerFrame,
        alert_on_unknown: faceSettings.alertOnUnknown,
        save_unknown_faces: faceSettings.saveUnknownFaces,
        alert_cooldown: faceSettings.alertCooldown,
      });
      localStorage.setItem('visao-general-settings', JSON.stringify(generalSettings));
      localStorage.setItem('visao-analysis-settings', JSON.stringify(analysisSettings));
      toast.success('Configurações salvas com sucesso!');
    } catch {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const addEmail = () => {
    if (newEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      if (!notificationSettings.emailRecipients.includes(newEmail)) {
        setNotificationSettings((prev) => ({
          ...prev,
          emailRecipients: [...prev.emailRecipients, newEmail],
        }));
      }
      setNewEmail('');
    } else {
      toast.error('E-mail inválido');
    }
  };
  const removeEmail = (email: string) => {
    setNotificationSettings((prev) => ({
      ...prev,
      emailRecipients: prev.emailRecipients.filter((e) => e !== email),
    }));
  };
  const addPhone = () => {
    const cleanPhone = newPhone.replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
      if (!notificationSettings.whatsappNumbers.includes(cleanPhone)) {
        setNotificationSettings((prev) => ({
          ...prev,
          whatsappNumbers: [...prev.whatsappNumbers, cleanPhone],
        }));
      }
      setNewPhone('');
    } else {
      toast.error('Telefone inválido');
    }
  };
  const removePhone = (phone: string) => {
    setNotificationSettings((prev) => ({
      ...prev,
      whatsappNumbers: prev.whatsappNumbers.filter((p) => p !== phone),
    }));
  };

  const handleClearData = async (type: string) => {
    try {
      const sentinel = '00000000-0000-0000-0000-000000000000';
      if (type === 'alerts') {
        await supabase.from('alerts').delete().neq('id', sentinel);
        toast.success('Alertas limpos');
      } else if (type === 'history') {
        await supabase.from('analysis_history').delete().neq('id', sentinel);
        await supabase.from('recognition_logs').delete().neq('id', sentinel);
        toast.success('Histórico limpo');
      } else if (type === 'zones') {
        await supabase.from('zone_events').delete().neq('id', sentinel);
        toast.success('Eventos de zonas limpos');
      }
      loadSettings();
    } catch {
      toast.error('Erro ao limpar dados');
    }
    setConfirmClearData(null);
  };

  return {
    loading,
    saving,
    confirmClearData,
    setConfirmClearData,
    generalSettings,
    setGeneralSettings,
    notificationSettings,
    setNotificationSettings,
    analysisSettings,
    setAnalysisSettings,
    faceSettings,
    setFaceSettings,
    systemStats,
    newEmail,
    setNewEmail,
    newPhone,
    setNewPhone,
    loadSettings,
    saveSettings,
    addEmail,
    removeEmail,
    addPhone,
    removePhone,
    handleClearData,
  };
}
