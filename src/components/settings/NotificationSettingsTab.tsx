import { Mail, MessageSquare, Webhook, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SettingsSection, SettingRow } from './SettingsSection';
import type { NotificationSettings } from './types';

interface Props {
  settings: NotificationSettings;
  onChange: React.Dispatch<React.SetStateAction<NotificationSettings>>;
  newEmail: string;
  setNewEmail: (v: string) => void;
  newPhone: string;
  setNewPhone: (v: string) => void;
  addEmail: () => void;
  removeEmail: (email: string) => void;
  addPhone: () => void;
  removePhone: (phone: string) => void;
}

export function NotificationSettingsTab({
  settings,
  onChange,
  newEmail,
  setNewEmail,
  newPhone,
  setNewPhone,
  addEmail,
  removeEmail,
  addPhone,
  removePhone,
}: Props) {
  return (
    <div className="space-y-6 mt-6">
      <SettingsSection title="E-mail" description="Alertas por e-mail" icon={Mail}>
        <SettingRow label="Ativar E-mail">
          <Switch
            checked={settings.emailEnabled}
            onCheckedChange={(checked) => onChange((prev) => ({ ...prev, emailEnabled: checked }))}
          />
        </SettingRow>
        {settings.emailEnabled && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label>Destinatários</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addEmail()}
                />
                <Button onClick={addEmail} variant="secondary">
                  Adicionar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.emailRecipients.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1">
                    {email}
                    <button
                      onClick={() => removeEmail(email)}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </SettingsSection>

      <SettingsSection title="WhatsApp" description="Alertas por WhatsApp" icon={MessageSquare}>
        <SettingRow label="Ativar WhatsApp">
          <Switch
            checked={settings.whatsappEnabled}
            onCheckedChange={(checked) =>
              onChange((prev) => ({ ...prev, whatsappEnabled: checked }))
            }
          />
        </SettingRow>
        {settings.whatsappEnabled && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label>Números</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="5511999999999"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addPhone()}
                />
                <Button onClick={addPhone} variant="secondary">
                  Adicionar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.whatsappNumbers.map((phone) => (
                  <Badge key={phone} variant="secondary" className="gap-1">
                    {phone}
                    <button
                      onClick={() => removePhone(phone)}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </SettingsSection>

      <SettingsSection title="Webhook" description="Integração via webhook" icon={Webhook}>
        <SettingRow label="Ativar Webhook">
          <Switch
            checked={settings.webhookEnabled}
            onCheckedChange={(checked) =>
              onChange((prev) => ({ ...prev, webhookEnabled: checked }))
            }
          />
        </SettingRow>
        {settings.webhookEnabled && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label>URL do Webhook</Label>
              <Input
                placeholder="https://..."
                value={settings.webhookUrl}
                onChange={(e) => onChange((prev) => ({ ...prev, webhookUrl: e.target.value }))}
              />
            </div>
          </>
        )}
      </SettingsSection>

      <SettingsSection title="Filtros" description="Controle de envio" icon={Clock}>
        <SettingRow label="Severidade" description="Notificar apenas">
          <div className="flex gap-1">
            {['low', 'medium', 'high', 'critical'].map((sev) => (
              <Badge
                key={sev}
                variant={settings.severityFilter.includes(sev) ? 'default' : 'outline'}
                className="cursor-pointer text-xs"
                onClick={() =>
                  onChange((prev) => ({
                    ...prev,
                    severityFilter: prev.severityFilter.includes(sev)
                      ? prev.severityFilter.filter((s) => s !== sev)
                      : [...prev.severityFilter, sev],
                  }))
                }
              >
                {sev}
              </Badge>
            ))}
          </div>
        </SettingRow>
        <Separator />
        <SettingRow label="Cooldown" description="Intervalo mínimo">
          <Select
            value={String(settings.cooldownMinutes)}
            onValueChange={(v) => onChange((prev) => ({ ...prev, cooldownMinutes: Number(v) }))}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 min</SelectItem>
              <SelectItem value="5">5 min</SelectItem>
              <SelectItem value="15">15 min</SelectItem>
              <SelectItem value="30">30 min</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </SettingsSection>
    </div>
  );
}
