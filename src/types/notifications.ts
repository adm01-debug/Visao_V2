export type NotificationType = "success" | "error" | "warning" | "info";
export interface Notification { id: string; type: NotificationType; title: string; message: string; duration?: number; action?: { label: string; onClick: () => void; }; }
export interface NotificationConfig { email: boolean; push: boolean; telegram: boolean; sound: boolean; desktop: boolean; }
