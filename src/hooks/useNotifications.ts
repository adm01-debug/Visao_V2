/**
 * VISÃO - useNotifications (Refactored)
 * Types extracted to ./notifications/notificationTypes.ts
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  NotificationChannel, NotificationSeverity, NotificationStatus,
  NotificationConfig, Notification, NotificationStats,
  UseNotificationsOptions, DEFAULT_NOTIFICATION_CONFIG, ALERT_SOUNDS,
} from './notifications/notificationTypes';

// Re-export types
export type { NotificationChannel, NotificationSeverity, NotificationStatus, NotificationConfig, Notification, NotificationStats, UseNotificationsOptions };

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { autoLoad = true, soundEnabled = true, pushEnabled = true, onNotification } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [config, setConfig] = useState<NotificationConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastNotificationRef = useRef<string | null>(null);

  const stats: NotificationStats = {
    total: notifications.length,
    unread: notifications.filter(n => n.status !== 'read').length,
    byChannel: { push: notifications.filter(n => n.channels.includes('push')).length, email: notifications.filter(n => n.channels.includes('email')).length, whatsapp: notifications.filter(n => n.channels.includes('whatsapp')).length, in_app: notifications.filter(n => n.channels.includes('in_app')).length, sound: notifications.filter(n => n.channels.includes('sound')).length },
    bySeverity: { low: notifications.filter(n => n.severity === 'low').length, medium: notifications.filter(n => n.severity === 'medium').length, high: notifications.filter(n => n.severity === 'high').length, critical: notifications.filter(n => n.severity === 'critical').length },
  };

  useEffect(() => { if (soundEnabled && typeof window !== 'undefined') { audioRef.current = new Audio(ALERT_SOUNDS.default); audioRef.current.preload = 'auto'; } return () => { audioRef.current = null; }; }, [soundEnabled]);
  useEffect(() => { if (pushEnabled && 'Notification' in window) setPushPermission(window.Notification.permission); }, [pushEnabled]);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      setNotifications((data || []).map(n => ({ id: n.id, type: n.type || 'alert', severity: n.severity || 'medium', title: n.camera_name || 'Notificação', message: n.message || '', data: { camera_id: n.camera_id, thumbnail: n.thumbnail }, channels: ['in_app'] as NotificationChannel[], status: (n.is_read ? 'read' : 'pending') as NotificationStatus, sentAt: n.timestamp, readAt: n.is_read ? n.timestamp : undefined, createdAt: n.created_at })));
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  const loadConfig = useCallback(async () => {
    try { const saved = localStorage.getItem('notification_config'); setConfig(saved ? JSON.parse(saved) : DEFAULT_NOTIFICATION_CONFIG); } catch { setConfig(DEFAULT_NOTIFICATION_CONFIG); }
  }, []);

  const saveConfig = useCallback(async (updates: Partial<NotificationConfig>) => {
    try { const nc = { ...config, ...updates } as NotificationConfig; localStorage.setItem('notification_config', JSON.stringify(nc)); setConfig(nc); toast.success('Configurações salvas'); } catch { toast.error('Erro ao salvar configurações'); }
  }, [config]);

  const markAsRead = useCallback(async (id: string) => {
    try { await supabase.from('alerts').update({ is_read: true }).eq('id', id); setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' as NotificationStatus, readAt: new Date().toISOString() } : n)); } catch { /* ignore */ }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try { const ids = notifications.filter(n => n.status !== 'read').map(n => n.id); if (!ids.length) return; await supabase.from('alerts').update({ is_read: true }).in('id', ids); setNotifications(prev => prev.map(n => ({ ...n, status: 'read' as NotificationStatus, readAt: new Date().toISOString() }))); toast.success('Todas notificações marcadas como lidas'); } catch { /* ignore */ }
  }, [notifications]);

  const deleteNotification = useCallback(async (id: string) => {
    try { await supabase.from('alerts').delete().eq('id', id); setNotifications(prev => prev.filter(n => n.id !== id)); } catch { /* ignore */ }
  }, []);

  const clearAll = useCallback(async () => {
    try { const ids = notifications.map(n => n.id); if (!ids.length) return; await supabase.from('alerts').delete().in('id', ids); setNotifications([]); toast.success('Notificações limpas'); } catch { /* ignore */ }
  }, [notifications]);

  const playAlertSound = useCallback(() => {
    if (!soundEnabled || !audioRef.current) return;
    try { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); } catch { /* ignore */ }
  }, [soundEnabled]);

  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) { toast.error('Navegador não suporta notificações push'); return false; }
    try { const p = await window.Notification.requestPermission(); setPushPermission(p); if (p === 'granted') { toast.success('Notificações push ativadas'); return true; } toast.error('Permissão negada para notificações'); return false; } catch { return false; }
  }, []);

  const sendTestNotification = useCallback(async (channel: NotificationChannel) => {
    try {
      if (channel === 'push') { if (pushPermission !== 'granted') { const ok = await requestPushPermission(); if (!ok) return; } new window.Notification('VISÃO - Teste', { body: 'Esta é uma notificação de teste', icon: '/favicon.ico', tag: 'test' }); }
      if (channel === 'sound') playAlertSound();
      if (channel === 'email' || channel === 'whatsapp') await supabase.functions.invoke('send-alert-notification', { body: { type: 'test', severity: 'low', title: 'Teste de Notificação', message: 'Esta é uma notificação de teste do VISÃO', channels: [channel] } });
      toast.success(`Notificação de teste enviada (${channel})`);
    } catch { toast.error('Erro ao enviar notificação de teste'); }
  }, [pushPermission, requestPushPermission, playAlertSound]);

  const processNewNotification = useCallback((notification: Notification) => {
    if (lastNotificationRef.current === notification.id) return;
    lastNotificationRef.current = notification.id;
    setNotifications(prev => [notification, ...prev]);
    onNotification?.(notification);
    toast[notification.severity === 'critical' ? 'error' : notification.severity === 'high' ? 'warning' : 'info'](notification.title, { description: notification.message });
    if (config?.soundEnabled && notification.channels.includes('sound')) playAlertSound();
    if (pushPermission === 'granted' && notification.channels.includes('push')) new window.Notification(notification.title, { body: notification.message, icon: '/favicon.ico', tag: notification.id });
  }, [config, pushPermission, onNotification, playAlertSound]);

  useEffect(() => {
    if (!autoLoad) return;
    const channel = supabase.channel('notifications').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
      const n = payload.new as Record<string, unknown>;
      processNewNotification({ id: n.id as string, type: (n.type as string) || 'alert', severity: (n.severity as NotificationSeverity) || 'medium', title: (n.camera_name as string) || 'Notificação', message: (n.message as string) || '', data: { camera_id: n.camera_id as string, thumbnail: n.thumbnail as string }, channels: ['in_app'], status: 'pending', sentAt: n.timestamp as string, createdAt: n.created_at as string });
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [autoLoad, processNewNotification]);

  useEffect(() => { if (autoLoad) { loadNotifications(); loadConfig(); } }, [autoLoad, loadNotifications, loadConfig]);

  return { notifications, unreadCount: stats.unread, config, stats, loading, pushPermission, loadNotifications, loadConfig, saveConfig, markAsRead, markAllAsRead, deleteNotification, clearAll, requestPushPermission, sendTestNotification, playAlertSound };
}

export default useNotifications;
