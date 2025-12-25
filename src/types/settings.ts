export interface Settings {
  general: GeneralSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  storage: StorageSettings;
}
export interface GeneralSettings { theme: 'light' | 'dark' | 'system'; locale: string; timezone: string; }
export interface NotificationSettings { email: boolean; push: boolean; sound: boolean; alertTypes: string[]; }
export interface SecuritySettings { twoFactor: boolean; sessionTimeout: number; ipWhitelist: string[]; }
export interface StorageSettings { retentionDays: number; maxSize: number; autoDelete: boolean; }
