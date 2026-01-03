/**
 * VISÃO - Sistema de Vigilância Inteligente
 * SecuritySettings Component
 */

import { memo, useState } from 'react';
import { 
  Shield, 
  Lock, 
  Key, 
  Eye, 
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Save,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface SecuritySettingsData {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  loginAttempts: {
    maxAttempts: number;
    lockoutDuration: number;
  };
  ipWhitelist: {
    enabled: boolean;
    ips: string[];
  };
  auditLog: boolean;
  encryptStorage: boolean;
}

interface SecuritySettingsProps {
  settings: SecuritySettingsData;
  onChange: (settings: SecuritySettingsData) => void;
  onSave?: () => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

function SecuritySettingsComponent({
  settings,
  onChange,
  onSave,
  isLoading = false,
  className
}: SecuritySettingsProps) {
  const [newIp, setNewIp] = useState('');

  const updateSettings = (updates: Partial<SecuritySettingsData>) => {
    onChange({ ...settings, ...updates });
  };

  const addIp = () => {
    if (newIp && !settings.ipWhitelist.ips.includes(newIp)) {
      updateSettings({
        ipWhitelist: {
          ...settings.ipWhitelist,
          ips: [...settings.ipWhitelist.ips, newIp],
        },
      });
      setNewIp('');
    }
  };

  const removeIp = (ip: string) => {
    updateSettings({
      ipWhitelist: {
        ...settings.ipWhitelist,
        ips: settings.ipWhitelist.ips.filter(i => i !== ip),
      },
    });
  };

  const getSecurityScore = () => {
    let score = 0;
    if (settings.twoFactorEnabled) score += 25;
    if (settings.passwordPolicy.minLength >= 8) score += 15;
    if (settings.passwordPolicy.requireUppercase) score += 10;
    if (settings.passwordPolicy.requireNumbers) score += 10;
    if (settings.passwordPolicy.requireSpecialChars) score += 15;
    if (settings.auditLog) score += 15;
    if (settings.encryptStorage) score += 10;
    return score;
  };

  const securityScore = getSecurityScore();

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Configurações de Segurança
            </CardTitle>
            <CardDescription>
              Gerencie as configurações de segurança do sistema
            </CardDescription>
          </div>
          <Badge 
            variant={securityScore >= 80 ? 'default' : securityScore >= 50 ? 'secondary' : 'destructive'}
            className="gap-1"
          >
            {securityScore >= 80 ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            {securityScore}% Seguro
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Two-Factor Authentication */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-muted-foreground" />
            <div>
              <Label>Autenticação em Dois Fatores</Label>
              <p className="text-sm text-muted-foreground">Adiciona uma camada extra de segurança</p>
            </div>
          </div>
          <Switch
            checked={settings.twoFactorEnabled}
            onCheckedChange={(checked) => updateSettings({ twoFactorEnabled: checked })}
          />
        </div>

        <Separator />

        {/* Session Timeout */}
        <div className="space-y-2">
          <Label>Tempo Limite da Sessão</Label>
          <Select 
            value={String(settings.sessionTimeout)} 
            onValueChange={(v) => updateSettings({ sessionTimeout: parseInt(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutos</SelectItem>
              <SelectItem value="30">30 minutos</SelectItem>
              <SelectItem value="60">1 hora</SelectItem>
              <SelectItem value="120">2 horas</SelectItem>
              <SelectItem value="480">8 horas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Password Policy */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Política de Senhas
          </Label>
          
          <div className="grid grid-cols-2 gap-4 pl-6">
            <div className="space-y-2">
              <Label className="text-sm">Tamanho mínimo</Label>
              <Select 
                value={String(settings.passwordPolicy.minLength)} 
                onValueChange={(v) => updateSettings({
                  passwordPolicy: { ...settings.passwordPolicy, minLength: parseInt(v) }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 caracteres</SelectItem>
                  <SelectItem value="8">8 caracteres</SelectItem>
                  <SelectItem value="10">10 caracteres</SelectItem>
                  <SelectItem value="12">12 caracteres</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.passwordPolicy.requireUppercase}
                  onCheckedChange={(checked) => updateSettings({
                    passwordPolicy: { ...settings.passwordPolicy, requireUppercase: checked }
                  })}
                />
                <Label className="text-sm">Letras maiúsculas</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.passwordPolicy.requireNumbers}
                  onCheckedChange={(checked) => updateSettings({
                    passwordPolicy: { ...settings.passwordPolicy, requireNumbers: checked }
                  })}
                />
                <Label className="text-sm">Números</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.passwordPolicy.requireSpecialChars}
                  onCheckedChange={(checked) => updateSettings({
                    passwordPolicy: { ...settings.passwordPolicy, requireSpecialChars: checked }
                  })}
                />
                <Label className="text-sm">Caracteres especiais</Label>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Audit & Encryption */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Log de Auditoria</Label>
              <p className="text-sm text-muted-foreground">Registra todas as ações do sistema</p>
            </div>
            <Switch
              checked={settings.auditLog}
              onCheckedChange={(checked) => updateSettings({ auditLog: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Criptografia de Dados</Label>
              <p className="text-sm text-muted-foreground">Criptografa dados sensíveis</p>
            </div>
            <Switch
              checked={settings.encryptStorage}
              onCheckedChange={(checked) => updateSettings({ encryptStorage: checked })}
            />
          </div>
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

export const SecuritySettings = memo(SecuritySettingsComponent);
