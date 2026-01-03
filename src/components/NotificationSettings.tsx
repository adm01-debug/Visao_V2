/**
 * VISÃO - Sistema de Vigilância Inteligente
 * NotificationSettings Component
 */

import { memo } from 'react';
import { 
  Bell, 
  BellOff,
  Volume2,
  VolumeX,
  Monitor,
  Mail,
  MessageSquare,
  Smartphone
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export interface NotificationSettingsData {
  enabled: boolean;
  desktop: boolean;
  sound: boolean;
  soundVolume: number;
  email: boolean;
  telegram: boolean;
  push: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface NotificationSettingsProps {
  settings: NotificationSettingsData;
  onChange: (settings: NotificationSettingsData) => void;
  className?: string;
}

function NotificationSettingsComponent({
  settings,
  onChange,
  className
}: NotificationSettingsProps) {
  const updateSettings = (updates: Partial<NotificationSettingsData>) => {
    onChange({ ...settings, ...updates });
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {settings.enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            Preferências de Notificação
          </CardTitle>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => updateSettings({ enabled: checked })}
          />
        </div>
      </CardHeader>

      <CardContent className={cn("space-y-6", !settings.enabled && "opacity-50 pointer-events-none")}>
        {/* Desktop Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-muted-foreground" />
            <div>
              <Label>Notificações Desktop</Label>
              <p className="text-sm text-muted-foreground">Exibir notificações no navegador</p>
            </div>
          </div>
          <Switch
            checked={settings.desktop}
            onCheckedChange={(checked) => updateSettings({ desktop: checked })}
          />
        </div>

        <Separator />

        {/* Sound */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.sound ? <Volume2 className="w-5 h-5 text-muted-foreground" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
              <div>
                <Label>Sons de Alerta</Label>
                <p className="text-sm text-muted-foreground">Tocar som ao receber alertas</p>
              </div>
            </div>
            <Switch
              checked={settings.sound}
              onCheckedChange={(checked) => updateSettings({ sound: checked })}
            />
          </div>
          
          {settings.sound && (
            <div className="pl-8 space-y-2">
              <Label className="text-sm">Volume: {settings.soundVolume}%</Label>
              <Slider
                value={[settings.soundVolume]}
                onValueChange={(v) => updateSettings({ soundVolume: v[0] })}
                max={100}
                step={5}
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Email */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <div>
              <Label>Notificações por Email</Label>
              <p className="text-sm text-muted-foreground">Receber alertas por email</p>
            </div>
          </div>
          <Switch
            checked={settings.email}
            onCheckedChange={(checked) => updateSettings({ email: checked })}
          />
        </div>

        <Separator />

        {/* Telegram */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
            <div>
              <Label>Telegram</Label>
              <p className="text-sm text-muted-foreground">Receber alertas no Telegram</p>
            </div>
          </div>
          <Switch
            checked={settings.telegram}
            onCheckedChange={(checked) => updateSettings({ telegram: checked })}
          />
        </div>

        <Separator />

        {/* Push */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-muted-foreground" />
            <div>
              <Label>Push Mobile</Label>
              <p className="text-sm text-muted-foreground">Notificações no celular</p>
            </div>
          </div>
          <Switch
            checked={settings.push}
            onCheckedChange={(checked) => updateSettings({ push: checked })}
          />
        </div>

        <Separator />

        {/* Quiet Hours */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BellOff className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label>Modo Silencioso</Label>
                <p className="text-sm text-muted-foreground">Pausar notificações em horários específicos</p>
              </div>
            </div>
            <Switch
              checked={settings.quietHours.enabled}
              onCheckedChange={(checked) => updateSettings({
                quietHours: { ...settings.quietHours, enabled: checked }
              })}
            />
          </div>

          {settings.quietHours.enabled && (
            <div className="pl-8 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm">De:</Label>
                <input
                  type="time"
                  value={settings.quietHours.start}
                  onChange={(e) => updateSettings({
                    quietHours: { ...settings.quietHours, start: e.target.value }
                  })}
                  className="px-2 py-1 rounded border text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Até:</Label>
                <input
                  type="time"
                  value={settings.quietHours.end}
                  onChange={(e) => updateSettings({
                    quietHours: { ...settings.quietHours, end: e.target.value }
                  })}
                  className="px-2 py-1 rounded border text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export const NotificationSettings = memo(NotificationSettingsComponent);
