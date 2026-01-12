import { useState, useCallback } from 'react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

export function useNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const show = useCallback((type: NotificationType, title: string, message?: string, duration = 5000) => {
    const id = Date.now().toString();
    const notification: Notification = { id, type, title, message, duration };
    setNotifications(prev => [...prev, notification]);
    if (duration > 0) setTimeout(() => dismiss(id), duration);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string) => show('success', title, message), [show]);
  const error = useCallback((title: string, message?: string) => show('error', title, message), [show]);
  const warning = useCallback((title: string, message?: string) => show('warning', title, message), [show]);
  const info = useCallback((title: string, message?: string) => show('info', title, message), [show]);

  return { notifications, show, dismiss, success, error, warning, info };
}

export default useNotification;
