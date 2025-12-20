/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useNotificationFlow
 * 
 * Gerencia o fluxo completo de notificações:
 * - Disparo de alertas
 * - Envio para múltiplos canais (email, whatsapp, telegram, push, webhook)
 * - Verificação de cooldown
 * - Verificação de schedule
 * - Logs de envio
 * - Retry em caso de falha
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
  metadata?: Record<string, any>;
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

// ============================================
// CONSTANTES
// ============================================

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

// Som de alerta
const ALERT_SOUNDS: Record<NotificationSeverity, string> = {
  low: '/sounds/notification.mp3',
  medium: '/sounds/alert.mp3',
  high: '/sounds/warning.mp3',
  critical: '/sounds/alarm.mp3',
};

// ============================================
// HOOK PRINCIPAL
// ============================================

interface UseNotificationFlowOptions {
  config?: Partial<NotificationConfig>;
  onNotificationSent?: (log: NotificationLog) => void;
  onError?: (error: Error, channel: NotificationChannel) => void;
}

interface UseNotificationFlowReturn {
  send: (payload: NotificationPayload) => Promise<NotificationLog>;
  sendToChannel: (channel: NotificationChannel, payload: NotificationPayload) => Promise<NotificationResult>;
  testChannel: (channel: NotificationChannel) => Promise<boolean>;
  getRecentLogs: () => NotificationLog[];
  clearCooldown: () => void;
  isSending: boolean;
  lastSentAt: Date | null;
  cooldownRemaining: number;
  config: NotificationConfig;
  updateConfig: (updates: Partial<NotificationConfig>) => void;
}

export function useNotificationFlow(options: UseNotificationFlowOptions = {}): UseNotificationFlowReturn {
  const { onNotificationSent, onError } = options;
  const { user } = useAuth();

  const [config, setConfig] = useState<NotificationConfig>({
    ...DEFAULT_CONFIG,
    ...options.config,
  });

  const [isSending, setIsSending] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [logs, setLogs] = useState<NotificationLog[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Atualizar cooldown
  useEffect(() => {
    if (lastSentAt && config.cooldownMinutes > 0) {
      const updateCooldown = () => {
        const elapsed = Date.now() - lastSentAt.getTime();
        const remaining = Math.max(0, config.cooldownMinutes * 60 * 1000 - elapsed);
        setCooldownRemaining(Math.ceil(remaining / 1000));
        
        if (remaining <= 0 && cooldownIntervalRef.current) {
          clearInterval(cooldownIntervalRef.current);
          cooldownIntervalRef.current = null;
        }
      };

      updateCooldown();
      cooldownIntervalRef.current = setInterval(updateCooldown, 1000);

      return () => {
        if (cooldownIntervalRef.current) {
          clearInterval(cooldownIntervalRef.current);
        }
      };
    }
  }, [lastSentAt, config.cooldownMinutes]);

  // Carregar config do banco
  useEffect(() => {
    const loadConfig = async () => {
      if (!user) return;

      try {
        const { data } = await supabase
          .from('notification_configs')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          setConfig(prev => ({
            ...prev,
            enabled: data.enabled ?? true,
            channels: data.channels || ['push', 'sound'],
            severityFilter: data.severity_filter || ['high', 'critical'],
            cooldownMinutes: data.cooldown_minutes || 5,
            scheduleEnabled: data.schedule_enabled || false,
            scheduleStart: data.schedule_start_time || '08:00',
            scheduleEnd: data.schedule_end_time || '22:00',
            scheduleDays: data.schedule_days || [1, 2, 3, 4, 5],
          }));
        }
      } catch (error) {
        console.error('[NotificationFlow] Erro ao carregar config:', error);
      }
    };

    loadConfig();
  }, [user]);

  // Verificar se está no horário de schedule
  const isWithinSchedule = useCallback((): boolean => {
    if (!config.scheduleEnabled) return true;

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (!config.scheduleDays.includes(currentDay)) {
      return false;
    }

    return currentTime >= config.scheduleStart && currentTime <= config.scheduleEnd;
  }, [config.scheduleEnabled, config.scheduleDays, config.scheduleStart, config.scheduleEnd]);

  // Verificar cooldown
  const isInCooldown = useCallback((): boolean => {
    if (!lastSentAt || config.cooldownMinutes === 0) return false;
    const elapsed = Date.now() - lastSentAt.getTime();
    return elapsed < config.cooldownMinutes * 60 * 1000;
  }, [lastSentAt, config.cooldownMinutes]);

  // Enviar para canal específico
  const sendToChannel = useCallback(async (
    channel: NotificationChannel, 
    payload: NotificationPayload
  ): Promise<NotificationResult> => {
    const result: NotificationResult = {
      channel,
      status: 'pending',
      retries: 0,
    };

    try {
      switch (channel) {
        case 'sound':
          // Tocar som local
          if (audioRef.current) {
            audioRef.current.pause();
          }
          audioRef.current = new Audio(ALERT_SOUNDS[payload.severity] || ALERT_SOUNDS.medium);
          await audioRef.current.play().catch(() => {
            console.warn('[NotificationFlow] Áudio bloqueado pelo navegador');
          });
          result.status = 'sent';
          result.sentAt = new Date();
          break;

        case 'push':
          // Notificação do navegador
          if ('Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification(payload.title, {
                body: payload.message,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/badge-72x72.png',
                tag: `visao-${payload.type}-${Date.now()}`,
                data: payload.metadata,
              });
              result.status = 'sent';
              result.sentAt = new Date();
            } else if (Notification.permission !== 'denied') {
              const permission = await Notification.requestPermission();
              if (permission === 'granted') {
                new Notification(payload.title, { body: payload.message });
                result.status = 'sent';
                result.sentAt = new Date();
              } else {
                result.status = 'skipped';
                result.error = 'Permissão negada';
              }
            } else {
              result.status = 'skipped';
              result.error = 'Notificações bloqueadas';
            }
          } else {
            result.status = 'skipped';
            result.error = 'Notificações não suportadas';
          }
          break;

        case 'email':
          const emailRes = await supabase.functions.invoke('send-alert-notification', {
            body: {
              provider: 'email',
              subject: `[${payload.severity.toUpperCase()}] ${payload.title}`,
              body: payload.message,
              metadata: {
                ...payload.metadata,
                cameraName: payload.cameraName,
                severity: payload.severity,
              },
            },
          });
          if (emailRes.error) throw emailRes.error;
          result.status = 'sent';
          result.sentAt = new Date();
          break;

        case 'whatsapp':
          const waRes = await supabase.functions.invoke('send-alert-notification', {
            body: {
              provider: 'whatsapp',
              message: `🔔 *${payload.title}*\n\n${payload.message}\n\n_Severidade: ${payload.severity}_`,
              imageUrl: payload.imageUrl,
            },
          });
          if (waRes.error) throw waRes.error;
          result.status = 'sent';
          result.sentAt = new Date();
          break;

        case 'telegram':
          const tgRes = await supabase.functions.invoke('send-telegram', {
            body: {
              message: `🔔 <b>${payload.title}</b>\n\n${payload.message}\n\n<i>Severidade: ${payload.severity}</i>`,
              parse_mode: 'HTML',
            },
          });
          if (tgRes.error) throw tgRes.error;
          result.status = 'sent';
          result.sentAt = new Date();
          break;

        case 'webhook':
          const { data: webhookConfig } = await supabase
            .from('notification_configs')
            .select('webhook_urls')
            .eq('user_id', user?.id)
            .maybeSingle();

          if (webhookConfig?.webhook_urls?.[0]) {
            const webhookRes = await fetch(webhookConfig.webhook_urls[0], {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'visao_alert',
                ...payload,
                timestamp: new Date().toISOString(),
              }),
            });
            if (!webhookRes.ok) throw new Error(`HTTP ${webhookRes.status}`);
            result.status = 'sent';
            result.sentAt = new Date();
          } else {
            result.status = 'skipped';
            result.error = 'Webhook não configurado';
          }
          break;

        default:
          result.status = 'skipped';
          result.error = 'Canal desconhecido';
      }
    } catch (error: any) {
      result.status = 'failed';
      result.error = error.message;
      onError?.(error, channel);
    }

    return result;
  }, [user, onError]);

  // Enviar para todos os canais configurados
  const send = useCallback(async (payload: NotificationPayload): Promise<NotificationLog> => {
    const log: NotificationLog = {
      id: crypto.randomUUID(),
      payload,
      results: [],
      createdAt: new Date(),
    };

    // Verificações
    if (!config.enabled) {
      log.results = config.channels.map(ch => ({
        channel: ch,
        status: 'skipped' as NotificationStatus,
        error: 'Notificações desabilitadas',
      }));
      log.completedAt = new Date();
      return log;
    }

    if (!config.severityFilter.includes(payload.severity)) {
      log.results = config.channels.map(ch => ({
        channel: ch,
        status: 'skipped' as NotificationStatus,
        error: `Severidade ${payload.severity} não está nos filtros`,
      }));
      log.completedAt = new Date();
      return log;
    }

    if (!isWithinSchedule()) {
      log.results = config.channels.map(ch => ({
        channel: ch,
        status: 'skipped' as NotificationStatus,
        error: 'Fora do horário agendado',
      }));
      log.completedAt = new Date();
      return log;
    }

    if (isInCooldown()) {
      log.results = config.channels.map(ch => ({
        channel: ch,
        status: 'skipped' as NotificationStatus,
        error: `Em cooldown (${cooldownRemaining}s restantes)`,
      }));
      log.completedAt = new Date();
      return log;
    }

    setIsSending(true);

    try {
      // Enviar para todos os canais em paralelo
      const results = await Promise.all(
        config.channels.map(channel => sendToChannel(channel, payload))
      );

      log.results = results;
      log.completedAt = new Date();

      // Atualizar last sent se pelo menos um teve sucesso
      if (results.some(r => r.status === 'sent')) {
        setLastSentAt(new Date());
      }

      // Salvar log
      setLogs(prev => [log, ...prev].slice(0, 100));

      // Callback
      onNotificationSent?.(log);

      // Registrar no banco
      await supabase.from('notification_logs').insert({
        user_id: user?.id,
        payload: payload as any,
        results: results as any,
        created_at: log.createdAt.toISOString(),
        completed_at: log.completedAt.toISOString(),
      }).catch(() => {}); // Ignorar erro se tabela não existir

    } catch (error) {
      console.error('[NotificationFlow] Erro ao enviar:', error);
    } finally {
      setIsSending(false);
    }

    return log;
  }, [config, isWithinSchedule, isInCooldown, cooldownRemaining, sendToChannel, user, onNotificationSent]);

  // Testar canal
  const testChannel = useCallback(async (channel: NotificationChannel): Promise<boolean> => {
    const testPayload: NotificationPayload = {
      title: 'Teste VISÃO',
      message: 'Esta é uma notificação de teste do sistema VISÃO.',
      severity: 'medium',
      type: 'test',
      metadata: { test: true, timestamp: new Date().toISOString() },
    };

    const result = await sendToChannel(channel, testPayload);
    
    if (result.status === 'sent') {
      toast.success(`Teste de ${channel} enviado com sucesso!`);
      return true;
    } else {
      toast.error(`Falha no teste de ${channel}: ${result.error}`);
      return false;
    }
  }, [sendToChannel]);

  // Limpar cooldown
  const clearCooldown = useCallback(() => {
    setLastSentAt(null);
    setCooldownRemaining(0);
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }
  }, []);

  // Atualizar config
  const updateConfig = useCallback((updates: Partial<NotificationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Retornar logs recentes
  const getRecentLogs = useCallback(() => logs, [logs]);

  return {
    send,
    sendToChannel,
    testChannel,
    getRecentLogs,
    clearCooldown,
    isSending,
    lastSentAt,
    cooldownRemaining,
    config,
    updateConfig,
  };
}

export default useNotificationFlow;
