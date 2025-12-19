// Browser Push Notifications using Web Notifications API

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default';

export const getNotificationPermission = (): NotificationPermissionStatus => {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission as NotificationPermissionStatus;
};

export const requestNotificationPermission = async (): Promise<NotificationPermissionStatus> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationPermissionStatus;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
};

export const isNotificationSupported = (): boolean => {
  return 'Notification' in window;
};

interface ShowNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  onClick?: () => void;
}

export const showBrowserNotification = ({
  title,
  body,
  icon = '/favicon.ico',
  tag,
  requireInteraction = false,
  onClick,
}: ShowNotificationOptions): Notification | null => {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon,
      tag,
      requireInteraction,
    });

    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }

    // Auto-close after 10 seconds if not requiring interaction
    if (!requireInteraction) {
      setTimeout(() => notification.close(), 10000);
    }

    return notification;
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
};

// Storage key for notification preference
const NOTIFICATIONS_ENABLED_KEY = 'browser-notifications-enabled';

export const setBrowserNotificationsEnabled = (enabled: boolean): void => {
  localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, JSON.stringify(enabled));
};

export const getBrowserNotificationsEnabled = (): boolean => {
  const stored = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
  return stored ? JSON.parse(stored) : true; // Default to enabled
};
