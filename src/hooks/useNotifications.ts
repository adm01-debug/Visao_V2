/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useNotifications
 * 
 * Gerencia notificações do sistema:
 * - Push notifications (Web Push API)
 * - Notificações in-app
 * - Sons de alerta
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

type NotificationChannel = 'push' | 'email' | 'whatsapp' | 'in_app' | 'sound';
type NotificationSeverity = 'low' | 'medium' | 'high' | 'critical';
type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';

interface NotificationConfig {
  id?: string;
  enabled: boolean;
  channels: NotificationChannel[];
  emailRecipients: string[];
  phoneRecipients: string[];
  webhookUrls: string[];
  severityFilter: NotificationSeverity[];
  cooldownMinutes: number;
  scheduleEnabled: boolean;
  scheduleStartTime: string;
  scheduleEndTime: string;
  scheduleDays: number[];
  soundEnabled: boolean;
  soundUrl?: string;
}

interface Notification {
  id: string;
  type: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  status: NotificationStatus;
  sentAt?: string;
  readAt?: string;
  createdAt: string;
}

interface NotificationStats {
  total: number;
  unread: number;
  byChannel: Record<NotificationChannel, number>;
  bySeverity: Record<NotificationSeverity, number>;
}

interface UseNotificationsOptions {
  autoLoad?: boolean;
  soundEnabled?: boolean;
  pushEnabled?: boolean;
  onNotification?: (notification: Notification) => void;
}

interface UseNotificationsReturn {
  // Estado
  notifications: Notification[];
  unreadCount: number;
  config: NotificationConfig | null;
  stats: NotificationStats;
  loading: boolean;
  pushPermission: NotificationPermission | null;
  
  // Ações
  loadNotifications: () => Promise<void>;
  loadConfig: () => Promise<void>;
  saveConfig: (config: Partial<NotificationConfig>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  requestPushPermission: () => Promise<boolean>;
  sendTestNotification: (channel: NotificationChannel) => Promise<void>;
  playAlertSound: () => void;
}

// ============================================
// CONSTANTES
// ============================================

const DEFAULT_CONFIG: NotificationConfig = {
  enabled: true,
  channels: ['in_app', 'sound'],
  emailRecipients: [],
  phoneRecipients: [],
  webhookUrls: [],
  severityFilter: ['high', 'critical'],
  cooldownMinutes: 5,
  scheduleEnabled: false,
  scheduleStartTime: '08:00',
  scheduleEndTime: '22:00',
  scheduleDays: [1, 2, 3, 4, 5], // Segunda a Sexta
  soundEnabled: true,
  soundUrl: '/sounds/alert.mp3',
};

const ALERT_SOUNDS = {
  default: '/sounds/alert.mp3',
  critical: '/sounds/critical.mp3',
  success: '/sounds/success.mp3',
};

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const {
    autoLoad = true,
    soundEnabled = true,
    pushEnabled = true,
    onNotification,
  } = options;

  // Estado
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [config, setConfig] = useState<NotificationConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | null>(null);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastNotificationRef = useRef<string | null>(null);

  // Stats computadas
  const stats: NotificationStats = {
    total: notifications.length,
    unread: notifications.filter(n => n.status !== 'read').length,
    byChannel: {
      push: notifications.filter(n => n.channels.includes('push')).length,
      email: notifications.filter(n => n.channels.includes('email')).length,
      whatsapp: notifications.filter(n => n.channels.includes('whatsapp')).length,
      in_app: notifications.filter(n => n.channels.includes('in_app')).length,
      sound: notifications.filter(n => n.channels.includes('sound')).length,
    },
    bySeverity: {
      low: notifications.filter(n => n.severity === 'low').length,
      medium: notifications.filter(n => n.severity === 'medium').length,
      high: notifications.filter(n => n.severity === 'high').length,
      critical: notifications.filter(n => n.severity === 'critical').length,
    },
  };

  const unreadCount = stats.unread;

  // Inicializar áudio
  useEffect(() => {
    if (soundEnabled && typeof window !== 'undefined') {
      audioRef.current = new Audio(ALERT_SOUNDS.default);
      audioRef.current.preload = 'auto';
    }
    return () => {
      audioRef.current = null;
    };
  }, [soundEnabled]);

  // Verificar permissão de push
  useEffect(() => {
    if (pushEnabled && 'Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, [pushEnabled]);

  // Carregar notificações (usando tabela alerts como fonte)
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const formatted: Notification[] = (data || []).map(n => ({
        id: n.id,
        type: n.type || 'alert',
        severity: n.severity || 'medium',
        title: n.camera_name || 'Notificação',
        message: n.message || '',
        data: { camera_id: n.camera_id, thumbnail: n.thumbnail },
        channels: ['in_app'] as NotificationChannel[],
        status: n.is_read ? 'read' as NotificationStatus : 'pending' as NotificationStatus,
        sentAt: n.timestamp,
        readAt: n.is_read ? n.timestamp : undefined,
        createdAt: n.created_at,
      }));

      setNotifications(formatted);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar configuração (usa config local por enquanto)
  const loadConfig = useCallback(async () => {
    try {
      // Por enquanto usamos config local, pois não existe tabela notification_configs
      const savedConfig = localStorage.getItem('notification_config');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      } else {
        setConfig(DEFAULT_CONFIG);
      }
    } catch (error) {

      setConfig(DEFAULT_CONFIG);
    }
  }, []);

  // Salvar configuração
  const saveConfig = useCallback(async (updates: Partial<NotificationConfig>) => {
    try {
      const newConfig = { ...config, ...updates } as NotificationConfig;
      localStorage.setItem('notification_config', JSON.stringify(newConfig));
      setConfig(newConfig);
      toast.success('Configurações salvas');
    } catch (error) {

      toast.error('Erro ao salvar configurações');
    }
  }, [config]);

  // Marcar como lida
  const markAsRead = useCallback(async (id: string) => {
    try {
      await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', id);

      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, status: 'read' as NotificationStatus, readAt: new Date().toISOString() } : n)
      );
    } catch (error) {

    }
  }, []);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    try {
      const unreadIds = notifications.filter(n => n.status !== 'read').map(n => n.id);
      
      if (unreadIds.length === 0) return;

      await supabase
        .from('alerts')
        .update({ is_read: true })
        .in('id', unreadIds);

      setNotifications(prev =>
        prev.map(n => ({ ...n, status: 'read' as NotificationStatus, readAt: new Date().toISOString() }))
      );

      toast.success('Todas notificações marcadas como lidas');
    } catch (error) {

    }
  }, [notifications]);

  // Deletar notificação
  const deleteNotification = useCallback(async (id: string) => {
    try {
      await supabase
        .from('alerts')
        .delete()
        .eq('id', id);

      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {

    }
  }, []);

  // Limpar todas
  const clearAll = useCallback(async () => {
    try {
      const ids = notifications.map(n => n.id);
      
      if (ids.length === 0) return;

      await supabase
        .from('alerts')
        .delete()
        .in('id', ids);

      setNotifications([]);
      toast.success('Notificações limpas');
    } catch (error) {

    }
  }, [notifications]);

  // Solicitar permissão de push
  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      toast.error('Navegador não suporta notificações push');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission === 'granted') {
        toast.success('Notificações push ativadas');
        return true;
      } else {
        toast.error('Permissão negada para notificações');
        return false;
      }
    } catch (error) {

      return false;
    }
  }, []);

  // Enviar notificação de teste
  const sendTestNotification = useCallback(async (channel: NotificationChannel) => {
    try {
      if (channel === 'push') {
        if (pushPermission !== 'granted') {
          const granted = await requestPushPermission();
          if (!granted) return;
        }

        new Notification('VISÃO - Teste', {
          body: 'Esta é uma notificação de teste',
          icon: '/favicon.ico',
          tag: 'test',
        });
      }

      if (channel === 'sound') {
        playAlertSound();
      }

      if (channel === 'email' || channel === 'whatsapp') {
        await supabase.functions.invoke('send-alert-notification', {
          body: {
            type: 'test',
            severity: 'low',
            title: 'Teste de Notificação',
            message: 'Esta é uma notificação de teste do VISÃO',
            channels: [channel],
          },
        });
      }

      toast.success(`Notificação de teste enviada (${channel})`);
    } catch (error) {

      toast.error('Erro ao enviar notificação de teste');
    }
  }, [pushPermission, requestPushPermission]);

  // Tocar som de alerta
  const playAlertSound = useCallback(() => {
    if (!soundEnabled || !audioRef.current) return;

    try {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {

      });
    } catch (error) {

    }
  }, [soundEnabled]);

  // Processar nova notificação (chamado pelo realtime)
  const processNewNotification = useCallback((notification: Notification) => {
    // Evitar duplicatas
    if (lastNotificationRef.current === notification.id) return;
    lastNotificationRef.current = notification.id;

    // Adicionar à lista
    setNotifications(prev => [notification, ...prev]);

    // Callback
    onNotification?.(notification);

    // Mostrar toast
    toast[notification.severity === 'critical' ? 'error' : notification.severity === 'high' ? 'warning' : 'info'](
      notification.title,
      { description: notification.message }
    );

    // Tocar som
    if (config?.soundEnabled && notification.channels.includes('sound')) {
      playAlertSound();
    }

    // Push notification
    if (pushPermission === 'granted' && notification.channels.includes('push')) {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
      });
    }
  }, [config, pushPermission, onNotification, playAlertSound]);

  // Realtime subscription
  useEffect(() => {
    if (!autoLoad) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          const n = payload.new as unknown;
          processNewNotification({
            id: n.id,
            type: n.type || 'alert',
            severity: n.severity || 'medium',
            title: n.camera_name || 'Notificação',
            message: n.message || '',
            data: { camera_id: n.camera_id, thumbnail: n.thumbnail },
            channels: ['in_app'],
            status: 'pending',
            sentAt: n.timestamp,
            createdAt: n.created_at,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [autoLoad, processNewNotification]);

  // Carregar dados iniciais
  useEffect(() => {
    if (autoLoad) {
      loadNotifications();
      loadConfig();
    }
  }, [autoLoad, loadNotifications, loadConfig]);

  return {
    notifications,
    unreadCount,
    config,
    stats,
    loading,
    pushPermission,
    loadNotifications,
    loadConfig,
    saveConfig,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    requestPushPermission,
    sendTestNotification,
    playAlertSound,
  };
}

export default useNotifications;
