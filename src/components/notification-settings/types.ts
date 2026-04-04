export interface NotificationConfig {
  id: string;
  name: string;
  enabled: boolean;
  channels: string[];
  email_recipients: string[];
  phone_recipients: string[];
  webhook_urls: string[];
  severity_filter: string[];
  schedule_enabled: boolean;
  schedule_start_time: string | null;
  schedule_end_time: string | null;
  schedule_days: number[] | null;
  cooldown_minutes: number;
}

export const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Baixa', icon: 'Info' as const, color: 'bg-blue-500' },
  { value: 'medium', label: 'Média', icon: 'AlertCircle' as const, color: 'bg-yellow-500' },
  { value: 'high', label: 'Alta', icon: 'AlertTriangle' as const, color: 'bg-orange-500' },
  { value: 'critical', label: 'Crítica', icon: 'Shield' as const, color: 'bg-red-500' },
] as const;

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
] as const;

export const CHANNEL_OPTIONS = [
  { value: 'push', label: 'Push Browser', icon: 'Bell' as const },
  { value: 'email', label: 'Email', icon: 'Mail' as const },
  { value: 'sms', label: 'SMS/WhatsApp', icon: 'Phone' as const },
  { value: 'webhook', label: 'Webhook', icon: 'Webhook' as const },
] as const;
