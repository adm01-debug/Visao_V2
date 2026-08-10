/**
 * VISÃO - useSettings (Refactored)
 * Types extracted to settings/types.ts
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Re-export types
export type {
  GeneralSettings,
  NotificationSettings,
  AnalysisSettings,
  FaceRecognitionSettings,
  RecordingSettings,
  SecuritySettings,
  AllSettings,
} from './settings/types';

export {
  defaultGeneralSettings,
  defaultNotificationSettings,
  defaultAnalysisSettings,
  defaultFaceRecognitionSettings,
  defaultRecordingSettings,
  defaultSecuritySettings,
} from './settings/types';

import {
  GeneralSettings,
  NotificationSettings,
  AnalysisSettings,
  FaceRecognitionSettings,
  RecordingSettings,
  SecuritySettings,
  AllSettings,
  defaultGeneralSettings,
  defaultNotificationSettings,
  defaultAnalysisSettings,
  defaultFaceRecognitionSettings,
  defaultRecordingSettings,
  defaultSecuritySettings,
} from './settings/types';

interface UseSettingsOptions {
  autoLoad?: boolean;
  syncTabs?: boolean;
}

export function useSettings(options: UseSettingsOptions = {}) {
  const { autoLoad = true, syncTabs = true } = options;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [general, setGeneralState] = useState<GeneralSettings>(defaultGeneralSettings);
  const [notifications, setNotificationsState] = useState<NotificationSettings>(
    defaultNotificationSettings
  );
  const [analysis, setAnalysisState] = useState<AnalysisSettings>(defaultAnalysisSettings);
  const [faceRecognition, setFaceRecognitionState] = useState<FaceRecognitionSettings>(
    defaultFaceRecognitionSettings
  );
  const [recording, setRecordingState] = useState<RecordingSettings>(defaultRecordingSettings);
  const [security, setSecurityState] = useState<SecuritySettings>(defaultSecuritySettings);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const [notifRes, faceRes] = await Promise.all([
        supabase.from('notification_configs').select('*').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('face_recognition_configs')
          .select('*')
          .eq('user_id', user.id)
          .is('camera_id', null)
          .maybeSingle(),
      ]);

      if (notifRes.data) {
        const d = notifRes.data;
        setNotificationsState({
          enabled: d.enabled ?? true,
          channels: (d.channels || ['push', 'sound']) as NotificationSettings['channels'],
          emailRecipients: d.email_recipients || [],
          whatsappNumbers: d.phone_recipients || [],
          telegramChatIds: [],
          webhookUrl: d.webhook_urls?.[0] || '',
          severityFilter: (d.severity_filter || [
            'high',
            'critical',
          ]) as NotificationSettings['severityFilter'],
          typeFilter: [],
          cooldownMinutes: d.cooldown_minutes || 5,
          scheduleEnabled: d.schedule_enabled || false,
          scheduleStart: d.schedule_start_time || '08:00',
          scheduleEnd: d.schedule_end_time || '22:00',
          scheduleDays: d.schedule_days || [1, 2, 3, 4, 5],
          soundVolume: 80,
          soundFile: 'alert.mp3',
        });
      }

      if (faceRes.data) {
        const d = faceRes.data;
        setFaceRecognitionState({
          enabled: d.enabled ?? true,
          matchThreshold: Number(d.match_threshold) || 0.6,
          minFaceQuality: Number(d.min_face_quality) || 0.5,
          minFaceSize: d.min_face_size || 80,
          detectMultipleFaces: d.detect_multiple_faces ?? true,
          maxFacesPerFrame: d.max_faces_per_frame || 10,
          alertOnUnknown: d.alert_on_unknown || false,
          alertOnBlacklist: true,
          saveUnknownFaces: d.save_unknown_faces ?? true,
          alertCooldown: d.alert_cooldown || 60,
          liveDetection: false,
        });
      }

      const tryLoad = <T extends object>(key: string, setter: (fn: (prev: T) => T) => void) => {
        const saved = localStorage.getItem(key);
        if (saved)
          try {
            setter((prev: T) => ({ ...prev, ...JSON.parse(saved) }));
          } catch {
            /* JSON inválido no localStorage; mantém estado atual */
          }
      };
      tryLoad('visao-settings-general', setGeneralState);
      tryLoad('visao-settings-analysis', setAnalysisState);
      tryLoad('visao-settings-recording', setRecordingState);
      tryLoad('visao-settings-security', setSecurityState);
    } catch {
      setError('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const save = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return false;
    }
    setSaving(true);
    setError(null);

    try {
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

      localStorage.setItem('visao-settings-general', JSON.stringify(general));
      localStorage.setItem('visao-settings-analysis', JSON.stringify(analysis));
      localStorage.setItem('visao-settings-recording', JSON.stringify(recording));
      localStorage.setItem('visao-settings-security', JSON.stringify(security));

      if (syncTabs)
        window.dispatchEvent(
          new CustomEvent('visao-settings-updated', { detail: { timestamp: Date.now() } })
        );
      toast.success('Configurações salvas com sucesso!');
      return true;
    } catch {
      setError('Erro ao salvar configurações');
      toast.error('Erro ao salvar configurações');
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, general, notifications, analysis, faceRecognition, recording, security, syncTabs]);

  const saveSection = useCallback(
    async (_section: keyof AllSettings): Promise<boolean> => save(),
    [save]
  );

  const setGeneral = useCallback(
    (u: Partial<GeneralSettings>) => setGeneralState((p) => ({ ...p, ...u })),
    []
  );
  const setNotifications = useCallback(
    (u: Partial<NotificationSettings>) => setNotificationsState((p) => ({ ...p, ...u })),
    []
  );
  const setAnalysis = useCallback(
    (u: Partial<AnalysisSettings>) => setAnalysisState((p) => ({ ...p, ...u })),
    []
  );
  const setFaceRecognition = useCallback(
    (u: Partial<FaceRecognitionSettings>) => setFaceRecognitionState((p) => ({ ...p, ...u })),
    []
  );
  const setRecording = useCallback(
    (u: Partial<RecordingSettings>) => setRecordingState((p) => ({ ...p, ...u })),
    []
  );
  const setSecurity = useCallback(
    (u: Partial<SecuritySettings>) => setSecurityState((p) => ({ ...p, ...u })),
    []
  );

  const reset = useCallback((section?: keyof AllSettings) => {
    if (!section) {
      setGeneralState(defaultGeneralSettings);
      setNotificationsState(defaultNotificationSettings);
      setAnalysisState(defaultAnalysisSettings);
      setFaceRecognitionState(defaultFaceRecognitionSettings);
      setRecordingState(defaultRecordingSettings);
      setSecurityState(defaultSecuritySettings);
    } else {
      const map: Record<string, () => void> = {
        general: () => setGeneralState(defaultGeneralSettings),
        notifications: () => setNotificationsState(defaultNotificationSettings),
        analysis: () => setAnalysisState(defaultAnalysisSettings),
        faceRecognition: () => setFaceRecognitionState(defaultFaceRecognitionSettings),
        recording: () => setRecordingState(defaultRecordingSettings),
        security: () => setSecurityState(defaultSecuritySettings),
      };
      map[section]?.();
    }
  }, []);

  const exportSettings = useCallback(
    (): string =>
      JSON.stringify(
        {
          general,
          notifications,
          analysis,
          faceRecognition,
          recording,
          security,
          exportedAt: new Date().toISOString(),
        },
        null,
        2
      ),
    [general, notifications, analysis, faceRecognition, recording, security]
  );

  const importSettings = useCallback((json: string): boolean => {
    try {
      const data = JSON.parse(json);
      if (data.general) setGeneralState((p) => ({ ...p, ...data.general }));
      if (data.notifications) setNotificationsState((p) => ({ ...p, ...data.notifications }));
      if (data.analysis) setAnalysisState((p) => ({ ...p, ...data.analysis }));
      if (data.faceRecognition) setFaceRecognitionState((p) => ({ ...p, ...data.faceRecognition }));
      if (data.recording) setRecordingState((p) => ({ ...p, ...data.recording }));
      if (data.security) setSecurityState((p) => ({ ...p, ...data.security }));
      toast.success('Configurações importadas com sucesso!');
      return true;
    } catch {
      toast.error('Formato de arquivo inválido');
      return false;
    }
  }, []);

  const settings = useMemo(
    (): AllSettings => ({
      general,
      notifications,
      analysis,
      faceRecognition,
      recording,
      security,
    }),
    [general, notifications, analysis, faceRecognition, recording, security]
  );

  useEffect(() => {
    if (!syncTabs) return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('visao-settings-')) load();
    };
    const handleCustom = () => load();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('visao-settings-updated', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('visao-settings-updated', handleCustom);
    };
  }, [syncTabs, load]);

  useEffect(() => {
    if (autoLoad) load();
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
