export type NotificationChannel = 'push' | 'email' | 'whatsapp' | 'in_app' | 'sound';
export type NotificationSeverity = 'low' | 'medium' | 'high' | 'critical';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';

export interface NotificationConfig {
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

export interface Notification {
  id: string;
  type: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  channels: NotificationChannel[];
  status: NotificationStatus;
  sentAt?: string;
  readAt?: string;
  createdAt: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byChannel: Record<NotificationChannel, number>;
  bySeverity: Record<NotificationSeverity, number>;
}

export interface UseNotificationsOptions {
  autoLoad?: boolean;
  soundEnabled?: boolean;
  pushEnabled?: boolean;
  onNotification?: (notification: Notification) => void;
}

export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
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
  scheduleDays: [1, 2, 3, 4, 5],
  soundEnabled: true,
  soundUrl: '/sounds/alert.mp3',
};

export const ALERT_SOUNDS = {
  default: '/sounds/alert.mp3',
  critical: '/sounds/critical.mp3',
  success: '/sounds/success.mp3',
};
