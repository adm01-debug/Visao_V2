/**
 * VISÃO - Sistema de Vigilância Inteligente
 * TelegramConfig Component
 */

import { memo, useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  Check, 
  X, 
  Loader2,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export interface TelegramConfigData {
  enabled: boolean;
  botToken?: string;
  chatId?: string;
  verified: boolean;
}

interface TelegramConfigProps {
  config: TelegramConfigData;
  onChange: (config: TelegramConfigData) => void;
  onTest?: () => Promise<boolean>;
  onSave?: () => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

function TelegramConfigComponent({
  config,
  onChange,
  onTest,
  onSave,
  isLoading = false,
  className
}: TelegramConfigProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const updateConfig = (updates: Partial<TelegramConfigData>) => {
    onChange({ ...config, ...updates, verified: false });
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!onTest) return;
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const success = await onTest();
      setTestResult(success ? 'success' : 'error');
      if (success) {
        onChange({ ...config, verified: true });
      }
    } catch {
      setTestResult('error');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Telegram
            </CardTitle>
            <CardDescription>
              Receba alertas diretamente no Telegram
            </CardDescription>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => updateConfig({ enabled: checked })}
          />
        </div>
      </CardHeader>

      <CardContent className={cn("space-y-4", !config.enabled && "opacity-50 pointer-events-none")}>
        {/* Instructions */}
        <Alert>
          <HelpCircle className="w-4 h-4" />
          <AlertDescription className="text-sm">
            1. Crie um bot no Telegram com @BotFather
            <br />
            2. Copie o token do bot
            <br />
            3. Inicie conversa com o bot e envie /start
            <br />
            4. Obtenha seu Chat ID com @userinfobot
          </AlertDescription>
        </Alert>

        {/* Bot Token */}
        <div className="space-y-2">
          <Label htmlFor="botToken">Token do Bot</Label>
          <Input
            id="botToken"
            type="password"
            placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
            value={config.botToken || ''}
            onChange={(e) => updateConfig({ botToken: e.target.value })}
          />
        </div>

        {/* Chat ID */}
        <div className="space-y-2">
          <Label htmlFor="chatId">Chat ID</Label>
          <Input
            id="chatId"
            placeholder="123456789"
            value={config.chatId || ''}
            onChange={(e) => updateConfig({ chatId: e.target.value })}
          />
        </div>

        {/* Test Result */}
        {testResult && (
          <Alert variant={testResult === 'success' ? 'default' : 'destructive'}>
            {testResult === 'success' ? (
              <>
                <Check className="w-4 h-4" />
                <AlertDescription>
                  Conexão testada com sucesso! Verifique o Telegram.
                </AlertDescription>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  Falha ao enviar mensagem. Verifique as credenciais.
                </AlertDescription>
              </>
            )}
          </Alert>
        )}

        {/* Verified Badge */}
        {config.verified && (
          <div className="flex items-center gap-2 text-sm text-green-500">
            <Check className="w-4 h-4" />
            Configuração verificada
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {onTest && (
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={!config.botToken || !config.chatId || isTesting}
              className="flex-1 gap-2"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Testar Conexão
                </>
              )}
            </Button>
          )}
          
          {onSave && (
            <Button
              onClick={onSave}
              disabled={isLoading || !config.botToken || !config.chatId}
              className="flex-1 gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Salvar
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export const TelegramConfig = memo(TelegramConfigComponent);
