/**
 * useNotificationPermission Hook
 * Notification permission management
 */
import { useState, useCallback, useEffect } from 'react';

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const isSupported = typeof Notification !== 'undefined';

  const requestPermission = useCallback(async () => {
    if (!isSupported) return 'denied';
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, [isSupported]);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') return null;
    return new Notification(title, options);
  }, [isSupported, permission]);

  useEffect(() => {
    if (isSupported) setPermission(Notification.permission);
  }, [isSupported]);

  return { permission, isSupported, requestPermission, showNotification };
}
export default useNotificationPermission;
