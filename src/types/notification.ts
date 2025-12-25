export interface Notification {
  id: string;
  type: 'alert' | 'system' | 'info';
  title: string;
  message: string;
  read: boolean;
  alertId?: string;
  createdAt: string;
}
export type NotificationType = Notification['type'];
