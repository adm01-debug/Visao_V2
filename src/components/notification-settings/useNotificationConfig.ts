import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { NotificationConfig } from './types';

export function useNotificationConfig() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<NotificationConfig | null>(null);

  const loadConfig = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notification_configs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig(data);
      } else {
        const defaultConfig = {
          user_id: user.id,
          name: 'Configuração Principal',
          enabled: true,
          channels: ['push'],
          email_recipients: [] as string[],
          phone_recipients: [] as string[],
          webhook_urls: [] as string[],
          severity_filter: ['high', 'critical'],
          schedule_enabled: false,
          schedule_start_time: '08:00',
          schedule_end_time: '22:00',
          schedule_days: [1, 2, 3, 4, 5],
          cooldown_minutes: 5,
        };

        const { data: newConfig, error: insertError } = await supabase
          .from('notification_configs')
          .insert(defaultConfig)
          .select()
          .single();

        if (insertError) throw insertError;
        setConfig(newConfig);
      }
    } catch {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const saveConfig = async () => {
    if (!config || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_configs')
        .update({
          name: config.name,
          enabled: config.enabled,
          channels: config.channels,
          email_recipients: config.email_recipients,
          phone_recipients: config.phone_recipients,
          webhook_urls: config.webhook_urls,
          severity_filter: config.severity_filter,
          schedule_enabled: config.schedule_enabled,
          schedule_start_time: config.schedule_start_time,
          schedule_end_time: config.schedule_end_time,
          schedule_days: config.schedule_days,
          cooldown_minutes: config.cooldown_minutes,
        })
        .eq('id', config.id);

      if (error) throw error;
      toast.success('Configurações salvas com sucesso');
    } catch {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (partial: Partial<NotificationConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...partial });
  };

  const toggleChannel = (channel: string) => {
    if (!config) return;
    const channels = config.channels.includes(channel)
      ? config.channels.filter((c) => c !== channel)
      : [...config.channels, channel];
    setConfig({ ...config, channels });
  };

  const toggleSeverity = (severity: string) => {
    if (!config) return;
    const severities = config.severity_filter.includes(severity)
      ? config.severity_filter.filter((s) => s !== severity)
      : [...config.severity_filter, severity];
    setConfig({ ...config, severity_filter: severities });
  };

  const toggleDay = (day: number) => {
    if (!config) return;
    const days = config.schedule_days ?? [];
    const newDays = days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort();
    setConfig({ ...config, schedule_days: newDays });
  };

  const testNotification = async (channel: string) => {
    toast.info(`Testando notificação via ${channel}...`);
    try {
      const { error } = await supabase.functions.invoke('send-alert-notification', {
        body: {
          alertId: 'test-' + Date.now(),
          type: 'security',
          severity: 'high',
          message: 'Esta é uma notificação de teste do sistema de vigilância.',
          cameraName: 'Câmera de Teste',
          timestamp: new Date().toISOString(),
          channels: [channel],
          emailRecipients: config?.email_recipients ?? [],
          phoneRecipients: config?.phone_recipients ?? [],
          webhookUrls: config?.webhook_urls ?? [],
        },
      });
      if (error) throw error;
      toast.success(`Notificação de teste enviada via ${channel}`);
    } catch {
      toast.error(`Erro ao testar notificação via ${channel}`);
    }
  };

  return {
    config,
    loading,
    saving,
    saveConfig,
    updateConfig,
    toggleChannel,
    toggleSeverity,
    toggleDay,
    testNotification,
  };
}
