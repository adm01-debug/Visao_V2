/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useNotificationFlow
 * 
 * Gerencia o fluxo de notificações (versão simplificada)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

export type NotificationChannel = 'email' | 'whatsapp' | 'telegram' | 'push' | 'webhook' | 'sound';
export type NotificationSeverity = 'low' | 'medium' | 'high' | 'critical';
export type NotificationStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'skipped';

export interface NotificationPayload {
  title: string;
  message: string;
  severity: NotificationSeverity;
  type: string;
  cameraId?: string;
  cameraName?: string;
  ruleId?: string;
  ruleName?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationResult {
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt?: Date;
  error?: string;
  retries?: number;
}

export interface NotificationLog {
  id: string;
  payload: NotificationPayload;
  results: NotificationResult[];
  createdAt: Date;
  completedAt?: Date;
}

export interface NotificationConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  severityFilter: NotificationSeverity[];
  cooldownMinutes: number;
  scheduleEnabled: boolean;
  scheduleStart: string;
  scheduleEnd: string;
  scheduleDays: number[];
  maxRetries: number;
  retryDelayMs: number;
}

const DEFAULT_CONFIG: NotificationConfig = {
  enabled: true,
  channels: ['push', 'sound'],
  severityFilter: ['high', 'critical'],
  cooldownMinutes: 5,
  scheduleEnabled: false,
  scheduleStart: '08:00',
  scheduleEnd: '22:00',
  scheduleDays: [1, 2, 3, 4, 5],
  maxRetries: 3,
  retryDelayMs: 5000,
};

// ============================================
// HOOK PRINCIPAL
// ============================================

interface UseNotificationFlowOptions {
  onNotificationSent?: (payload: NotificationPayload, results: NotificationResult[]) => void;
  onNotificationFailed?: (payload: NotificationPayload, error: string) => void;
}

interface UseNotificationFlowReturn {
  config: NotificationConfig;
  logs: NotificationLog[];
  isSending: boolean;
  lastNotification: NotificationLog | null;
  sendNotification: (payload: NotificationPayload) => Promise<NotificationResult[]>;
  updateConfig: (updates: Partial<NotificationConfig>) => void;
  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<boolean>;
  clearLogs: () => void;
  canSendNotification: (severity: NotificationSeverity) => boolean;
  testNotification: (channel: NotificationChannel) => Promise<boolean>;
}

export function useNotificationFlow(
  options: UseNotificationFlowOptions = {}
): UseNotificationFlowReturn {
  const { onNotificationSent, onNotificationFailed } = options;
  const { user } = useAuth();

  const [config, setConfig] = useState<NotificationConfig>(DEFAULT_CONFIG);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [lastNotification, setLastNotification] = useState<NotificationLog | null>(null);

  const lastNotificationTimeRef = useRef<Map<string, number>>(new Map());

  // Carregar configuração do banco
  const loadConfig = useCallback(async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('notification_configs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setConfig({
          enabled: data.enabled ?? true,
          channels: (data.channels || ['push', 'sound']) as NotificationChannel[],
          severityFilter: (data.severity_filter || ['high', 'critical']) as NotificationSeverity[],
          cooldownMinutes: data.cooldown_minutes || 5,
          scheduleEnabled: data.schedule_enabled || false,
          scheduleStart: data.schedule_start_time || '08:00',
          scheduleEnd: data.schedule_end_time || '22:00',
          scheduleDays: data.schedule_days || [1, 2, 3, 4, 5],
          maxRetries: DEFAULT_CONFIG.maxRetries,
          retryDelayMs: DEFAULT_CONFIG.retryDelayMs,
        });
      }
    } catch (err) {
      // rm
    }
  }, [user]);

  // Carregar config ao iniciar
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Salvar configuração
  const saveConfig = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('notification_configs')
        .upsert({
          user_id: user.id,
          enabled: config.enabled,
          channels: config.channels,
          severity_filter: config.severityFilter,
          cooldown_minutes: config.cooldownMinutes,
          schedule_enabled: config.scheduleEnabled,
          schedule_start_time: config.scheduleStart,
          schedule_end_time: config.scheduleEnd,
          schedule_days: config.scheduleDays,
        });

      if (error) throw error;

      toast.success('Configurações de notificação salvas');
      return true;
    } catch (err) {
      // rm
      toast.error('Erro ao salvar configurações');
      return false;
    }
  }, [user, config]);

  // Verificar se pode enviar notificação
  const canSendNotification = useCallback((severity: NotificationSeverity): boolean => {
    if (!config.enabled) return false;
    if (!config.severityFilter.includes(severity)) return false;

    // Verificar schedule
    if (config.scheduleEnabled) {
      const now = new Date();
      const day = now.getDay();
      if (!config.scheduleDays.includes(day)) return false;

      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = config.scheduleStart.split(':').map(Number);
      const [endH, endM] = config.scheduleEnd.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (currentTime < startMinutes || currentTime > endMinutes) return false;
    }

    return true;
  }, [config]);

  // Enviar notificação
  const sendNotification = useCallback(async (
    payload: NotificationPayload
  ): Promise<NotificationResult[]> => {
    if (!canSendNotification(payload.severity)) {
      return [{ channel: 'push', status: 'skipped' }];
    }

    // Verificar cooldown
    const key = `${payload.type}-${payload.cameraId || 'global'}`;
    const lastTime = lastNotificationTimeRef.current.get(key) || 0;
    const now = Date.now();
    const cooldownMs = config.cooldownMinutes * 60 * 1000;

    if (now - lastTime < cooldownMs) {
      return [{ channel: 'push', status: 'skipped' }];
    }

    setIsSending(true);
    const results: NotificationResult[] = [];

    // Processar cada canal
    for (const channel of config.channels) {
      const result: NotificationResult = {
        channel,
        status: 'pending',
      };

      try {
        switch (channel) {
          case 'sound':
            // Tocar som localmente
            result.status = 'sent';
            result.sentAt = new Date();
            break;

          case 'push':
            // Notificação do navegador
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(payload.title, {
                body: payload.message,
                icon: '/favicon.ico',
              });
              result.status = 'sent';
              result.sentAt = new Date();
            } else {
              result.status = 'failed';
              result.error = 'Permissão de notificação não concedida';
            }
            break;

          case 'telegram':
            // Chamar edge function
            try {
              await supabase.functions.invoke('send-telegram', {
                body: {
                  message: `${payload.title}

${payload.message}`,
                },
              });
              result.status = 'sent';
              result.sentAt = new Date();
            } catch (err) {
              result.status = 'failed';
              result.error = err instanceof Error ? err.message : 'Erro desconhecido';
            }
            break;

          default:
            result.status = 'skipped';
        }
      } catch (err) {
        result.status = 'failed';
        result.error = err instanceof Error ? err.message : 'Erro desconhecido';
      }

      results.push(result);
    }

    // Registrar envio
    lastNotificationTimeRef.current.set(key, now);

    const log: NotificationLog = {
      id: `notif-${Date.now()}`,
      payload,
      results,
      createdAt: new Date(),
      completedAt: new Date(),
    };

    setLogs(prev => [log, ...prev].slice(0, 50));
    setLastNotification(log);
    setIsSending(false);

    // Callbacks
    const hasSuccess = results.some(r => r.status === 'sent');
    if (hasSuccess) {
      onNotificationSent?.(payload, results);
    } else {
      onNotificationFailed?.(payload, 'Nenhum canal enviou com sucesso');
    }

    return results;
  }, [config, canSendNotification, onNotificationSent, onNotificationFailed]);

  // Atualizar config
  const updateConfig = useCallback((updates: Partial<NotificationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Limpar logs
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Testar canal
  const testNotification = useCallback(async (channel: NotificationChannel): Promise<boolean> => {
    const testPayload: NotificationPayload = {
      title: 'Teste de Notificação',
      message: 'Esta é uma notificação de teste do sistema VISÃO.',
      severity: 'low',
      type: 'test',
    };

    const originalChannels = config.channels;
    setConfig(prev => ({ ...prev, channels: [channel] }));

    const results = await sendNotification(testPayload);

    setConfig(prev => ({ ...prev, channels: originalChannels }));

    return results.some(r => r.status === 'sent');
  }, [config.channels, sendNotification]);

  return {
    config,
    logs,
    isSending,
    lastNotification,
    sendNotification,
    updateConfig,
    loadConfig,
    saveConfig,
    clearLogs,
    canSendNotification,
    testNotification,
  };
}

export default useNotificationFlow;
