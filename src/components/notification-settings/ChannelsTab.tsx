import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, Phone, Webhook, Plus, X, TestTube } from 'lucide-react';
import { toast } from 'sonner';
import type { NotificationConfig } from './types';
import { CHANNEL_OPTIONS } from './types';

const ICONS = { Bell, Mail, Phone, Webhook } as const;

interface ChannelsTabProps {
  config: NotificationConfig;
  onUpdate: (partial: Partial<NotificationConfig>) => void;
  onToggleChannel: (channel: string) => void;
  onTest: (channel: string) => void;
}

function RecipientList({
  items,
  onRemove,
  onAdd,
  inputType,
  placeholder,
  testChannel: _testChannel,
  onTest: _onTest,
}: {
  items: string[];
  onRemove: (item: string) => void;
  onAdd: (value: string) => void;
  inputType: string;
  placeholder: string;
  testChannel: string;
  onTest: (channel: string) => void;
}) {
  const [value, setValue] = useState('');

  const handleAdd = () => {
    if (!value.trim()) {
      toast.error('Campo obrigatório');
      return;
    }
    if (items.includes(value)) {
      toast.error('Já adicionado');
      return;
    }
    onAdd(value);
    setValue('');
  };

  return (
    <CardContent className="space-y-4">
      <div className="flex gap-2">
        <Input
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} variant="secondary" className="gap-1">
            {item}
            <button onClick={() => onRemove(item)}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </CardContent>
  );
}

export function ChannelsTab({ config, onUpdate, onToggleChannel, onTest }: ChannelsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Canais de Notificação</CardTitle>
          <CardDescription>Escolha como deseja receber os alertas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CHANNEL_OPTIONS.map((channel) => {
              const Icon = ICONS[channel.icon];
              const isActive = config.channels.includes(channel.value);
              return (
                <button
                  key={channel.value}
                  onClick={() => onToggleChannel(channel.value)}
                  className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                    isActive
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                  />
                  <span
                    className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    {channel.label}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {config.channels.includes('email') && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Destinatários de Email
                </CardTitle>
                <CardDescription>Adicione os emails que receberão os alertas</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => onTest('email')}>
                <TestTube className="h-4 w-4 mr-2" />
                Testar
              </Button>
            </div>
          </CardHeader>
          <RecipientList
            items={config.email_recipients}
            inputType="email"
            placeholder="email@exemplo.com"
            testChannel="email"
            onTest={onTest}
            onAdd={(v) => onUpdate({ email_recipients: [...config.email_recipients, v] })}
            onRemove={(v) =>
              onUpdate({ email_recipients: config.email_recipients.filter((e) => e !== v) })
            }
          />
        </Card>
      )}

      {config.channels.includes('sms') && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Números de Telefone
                </CardTitle>
                <CardDescription>Adicione números para SMS/WhatsApp</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => onTest('whatsapp')}>
                <TestTube className="h-4 w-4 mr-2" />
                Testar
              </Button>
            </div>
          </CardHeader>
          <RecipientList
            items={config.phone_recipients}
            inputType="tel"
            placeholder="+55 11 99999-9999"
            testChannel="whatsapp"
            onTest={onTest}
            onAdd={(v) => onUpdate({ phone_recipients: [...config.phone_recipients, v] })}
            onRemove={(v) =>
              onUpdate({ phone_recipients: config.phone_recipients.filter((p) => p !== v) })
            }
          />
        </Card>
      )}

      {config.channels.includes('webhook') && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  URLs de Webhook
                </CardTitle>
                <CardDescription>Integre com sistemas externos via webhook</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => onTest('webhook')}>
                <TestTube className="h-4 w-4 mr-2" />
                Testar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <RecipientList
              items={config.webhook_urls}
              inputType="url"
              placeholder="https://api.exemplo.com/webhook"
              testChannel="webhook"
              onTest={onTest}
              onAdd={(v) => onUpdate({ webhook_urls: [...config.webhook_urls, v] })}
              onRemove={(v) =>
                onUpdate({ webhook_urls: config.webhook_urls.filter((w) => w !== v) })
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
