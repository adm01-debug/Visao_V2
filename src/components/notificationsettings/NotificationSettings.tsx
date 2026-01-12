import React from 'react';
import { cn } from '@/lib/utils';
import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { ToggleSetting } from '@/components/togglesetting/ToggleSetting';

interface NotificationConfig {
  push: boolean;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

interface NotificationSettingsProps {
  config: NotificationConfig;
  onChange: (config: NotificationConfig) => void;
  className?: string;
}

export function NotificationSettings({ config, onChange, className }: NotificationSettingsProps) {
  const update = (key: keyof NotificationConfig) => (value: boolean) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className={cn('space-y-1', className)}>
      <h4 className="font-medium flex items-center gap-2 mb-3"><Bell className="h-4 w-4" />Notificações</h4>
      <ToggleSetting label="Push" description="Notificações no navegador/app" checked={config.push} onChange={update('push')} />
      <ToggleSetting label="E-mail" description="Alertas por e-mail" checked={config.email} onChange={update('email')} />
      <ToggleSetting label="SMS" description="Mensagens de texto" checked={config.sms} onChange={update('sms')} />
      <ToggleSetting label="WhatsApp" description="Alertas via WhatsApp" checked={config.whatsapp} onChange={update('whatsapp')} />
    </div>
  );
}

export default NotificationSettings;
