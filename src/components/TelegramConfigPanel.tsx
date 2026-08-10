/**
 * VISÃO - Telegram Config Panel
 * Configuração de alertas via Telegram (refatorado)
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  MessageCircle,
  Send,
  CheckCircle2,
  AlertCircle,
  Bell,
  Settings,
  TestTube,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTelegramConfig } from './telegram/useTelegramConfig';
import { TelegramInstructions } from './telegram/TelegramInstructions';

interface TelegramConfigPanelProps {
  className?: string;
  onConfigChange?: (config: {
    enabled: boolean;
    botToken: string;
    chatId: string;
    sendPhotos: boolean;
    alertTypes: string[];
  }) => void;
}

export function TelegramConfigPanel({ className, onConfigChange }: TelegramConfigPanelProps) {
  const { config, setConfig, testing, testResult, saveConfig, testConnection } =
    useTelegramConfig(onConfigChange);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <MessageCircle className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">Alertas via Telegram</h2>
          <p className="text-sm text-muted-foreground">Receba notificações no seu celular</p>
        </div>
      </div>

      {/* Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn('p-2 rounded-full', config.enabled ? 'bg-success/10' : 'bg-muted')}
              >
                <Bell
                  className={cn(
                    'h-5 w-5',
                    config.enabled ? 'text-success' : 'text-muted-foreground'
                  )}
                />
              </div>
              <div>
                <p className="font-medium">Notificações do Telegram</p>
                <p className="text-sm text-muted-foreground">
                  {config.enabled ? 'Ativo - Você receberá alertas' : 'Desativado'}
                </p>
              </div>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Configuração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração do Bot
          </CardTitle>
          <CardDescription>Configure seu bot do Telegram para receber alertas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Token do Bot</Label>
            <Input
              type="password"
              placeholder="123456789:ABCDefGhIJKlmNOPQrstUVWxyz"
              value={config.botToken}
              onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Obtido através do @BotFather no Telegram
            </p>
          </div>

          <div className="space-y-2">
            <Label>Chat ID</Label>
            <Input
              placeholder="-1001234567890 ou 123456789"
              value={config.chatId}
              onChange={(e) => setConfig({ ...config, chatId: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              ID do chat, grupo ou canal onde receberá os alertas
            </p>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="font-medium">Enviar fotos com alertas</p>
              <p className="text-sm text-muted-foreground">
                Incluir snapshot da câmera nas notificações
              </p>
            </div>
            <Switch
              checked={config.sendPhotos}
              onCheckedChange={(sendPhotos) => setConfig({ ...config, sendPhotos })}
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={saveConfig} className="flex-1">
              Salvar Configuração
            </Button>
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={testing || !config.botToken || !config.chatId}
            >
              {testing ? (
                <>
                  <Send className="h-4 w-4 mr-2 animate-pulse" />
                  Enviando...
                </>
              ) : testResult === 'success' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2 text-success" />
                  Sucesso
                </>
              ) : testResult === 'error' ? (
                <>
                  <AlertCircle className="h-4 w-4 mr-2 text-destructive" />
                  Erro
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Testar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instruções */}
      <TelegramInstructions />

      {/* Exemplo de mensagem */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Exemplo de Alerta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-foreground/95 rounded-lg p-4 text-foreground text-sm font-sans">
            <p className="mb-2">
              🚨 <strong>ALERTA - VISÃO</strong>
            </p>
            <p className="text-muted-foreground">
              Tipo: <strong>Pessoa na Blacklist</strong>
            </p>
            <p className="text-muted-foreground">Câmera: Entrada Principal</p>
            <p className="text-muted-foreground">Pessoa: João Silva</p>
            <p className="text-muted-foreground text-xs mt-2">📅 20/12/2025 14:32:45</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TelegramConfigPanel;
