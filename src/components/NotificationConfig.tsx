/**
 * VISÃO - Sistema de Vigilância Inteligente
 * NotificationConfig Component
 */

import { memo, useState } from 'react';
import { 
  Bell, 
  Mail, 
  Phone, 
  MessageSquare, 
  Globe,
  Save,
  Plus,
  Trash2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface NotificationConfigData {
  email: {
    enabled: boolean;
    recipients: string[];
  };
  push: {
    enabled: boolean;
    sound: boolean;
  };
  sms: {
    enabled: boolean;
    recipients: string[];
  };
  telegram: {
    enabled: boolean;
    chatId?: string;
  };
  webhook: {
    enabled: boolean;
    urls: string[];
  };
  severityFilter: ('low' | 'medium' | 'high' | 'critical')[];
}

interface NotificationConfigProps {
  config: NotificationConfigData;
  onChange: (config: NotificationConfigData) => void;
  onSave?: () => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

function NotificationConfigComponent({
  config,
  onChange,
  onSave,
  isLoading = false,
  className
}: NotificationConfigProps) {
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newWebhook, setNewWebhook] = useState('');

  const updateConfig = (updates: Partial<NotificationConfigData>) => {
    onChange({ ...config, ...updates });
  };

  const addEmail = () => {
    if (newEmail && !config.email.recipients.includes(newEmail)) {
      updateConfig({
        email: {
          ...config.email,
          recipients: [...config.email.recipients, newEmail],
        },
      });
      setNewEmail('');
    }
  };

  const removeEmail = (email: string) => {
    updateConfig({
      email: {
        ...config.email,
        recipients: config.email.recipients.filter(e => e !== email),
      },
    });
  };

  const addPhone = () => {
    if (newPhone && !config.sms.recipients.includes(newPhone)) {
      updateConfig({
        sms: {
          ...config.sms,
          recipients: [...config.sms.recipients, newPhone],
        },
      });
      setNewPhone('');
    }
  };

  const removePhone = (phone: string) => {
    updateConfig({
      sms: {
        ...config.sms,
        recipients: config.sms.recipients.filter(p => p !== phone),
      },
    });
  };

  const addWebhook = () => {
    if (newWebhook && !config.webhook.urls.includes(newWebhook)) {
      updateConfig({
        webhook: {
          ...config.webhook,
          urls: [...config.webhook.urls, newWebhook],
        },
      });
      setNewWebhook('');
    }
  };

  const removeWebhook = (url: string) => {
    updateConfig({
      webhook: {
        ...config.webhook,
        urls: config.webhook.urls.filter(u => u !== url),
      },
    });
  };

  const toggleSeverity = (severity: 'low' | 'medium' | 'high' | 'critical') => {
    const newFilter = config.severityFilter.includes(severity)
      ? config.severityFilter.filter(s => s !== severity)
      : [...config.severityFilter, severity];
    updateConfig({ severityFilter: newFilter });
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Configurações de Notificação
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Severity Filter */}
        <div className="space-y-3">
          <Label>Filtrar por Severidade</Label>
          <div className="flex flex-wrap gap-2">
            {(['low', 'medium', 'high', 'critical'] as const).map((severity) => (
              <Badge
                key={severity}
                variant={config.severityFilter.includes(severity) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleSeverity(severity)}
              >
                {severity === 'low' && 'Baixa'}
                {severity === 'medium' && 'Média'}
                {severity === 'high' && 'Alta'}
                {severity === 'critical' && 'Crítica'}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Push Notifications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <Label>Notificações Push</Label>
            </div>
            <Switch
              checked={config.push.enabled}
              onCheckedChange={(checked) => updateConfig({ push: { ...config.push, enabled: checked } })}
            />
          </div>
          {config.push.enabled && (
            <div className="flex items-center gap-2 pl-6">
              <Switch
                checked={config.push.sound}
                onCheckedChange={(checked) => updateConfig({ push: { ...config.push, sound: checked } })}
              />
              <Label className="flex items-center gap-1">
                {config.push.sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                Som de alerta
              </Label>
            </div>
          )}
        </div>

        <Separator />

        {/* Email */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <Label>Email</Label>
            </div>
            <Switch
              checked={config.email.enabled}
              onCheckedChange={(checked) => updateConfig({ email: { ...config.email, enabled: checked } })}
            />
          </div>
          {config.email.enabled && (
            <div className="pl-6 space-y-2">
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <Button variant="outline" onClick={addEmail}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {config.email.recipients.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1">
                    {email}
                    <button onClick={() => removeEmail(email)}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Telegram */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <Label>Telegram</Label>
            </div>
            <Switch
              checked={config.telegram.enabled}
              onCheckedChange={(checked) => updateConfig({ telegram: { ...config.telegram, enabled: checked } })}
            />
          </div>
          {config.telegram.enabled && (
            <div className="pl-6">
              <Input
                placeholder="Chat ID do Telegram"
                value={config.telegram.chatId || ''}
                onChange={(e) => updateConfig({ telegram: { ...config.telegram, chatId: e.target.value } })}
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Webhook */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <Label>Webhooks</Label>
            </div>
            <Switch
              checked={config.webhook.enabled}
              onCheckedChange={(checked) => updateConfig({ webhook: { ...config.webhook, enabled: checked } })}
            />
          </div>
          {config.webhook.enabled && (
            <div className="pl-6 space-y-2">
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://..."
                  value={newWebhook}
                  onChange={(e) => setNewWebhook(e.target.value)}
                />
                <Button variant="outline" onClick={addWebhook}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1">
                {config.webhook.urls.map((url) => (
                  <div key={url} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate text-muted-foreground">{url}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeWebhook(url)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        {onSave && (
          <Button onClick={onSave} disabled={isLoading} className="w-full gap-2">
            <Save className="w-4 h-4" />
            {isLoading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export const NotificationConfig = memo(NotificationConfigComponent);
