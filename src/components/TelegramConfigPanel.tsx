/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: TelegramConfigPanel
 * 
 * Configuração de alertas via Telegram
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageCircle, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  Copy,
  ExternalLink,
  Bell,
  Settings,
  TestTube
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TIPOS
// ============================================

interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  sendPhotos: boolean;
  alertTypes: string[];
}

interface TelegramConfigPanelProps {
  className?: string;
  onConfigChange?: (config: TelegramConfig) => void;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function TelegramConfigPanel({ className, onConfigChange }: TelegramConfigPanelProps) {
  const [config, setConfig] = useState<TelegramConfig>({
    enabled: false,
    botToken: '',
    chatId: '',
    sendPhotos: true,
    alertTypes: ['blacklist', 'critical', 'high']
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  // Carregar config do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('telegram-config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
      } catch (e) {
        // rm
      }
    }
  }, []);

  // Salvar config
  const saveConfig = () => {
    localStorage.setItem('telegram-config', JSON.stringify(config));
    onConfigChange?.(config);
    toast.success('Configuração do Telegram salva');
  };

  // Testar conexão
  const testConnection = async () => {
    if (!config.botToken || !config.chatId) {
      toast.error('Preencha o Token do Bot e o Chat ID');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-telegram', {
        body: {
          botToken: config.botToken,
          chatId: config.chatId,
          message: `🔔 <b>Teste de Conexão - VISÃO</b>

✅ Sua configuração do Telegram está funcionando corretamente!

📅 Data: ${new Date().toLocaleString('pt-BR')}`
        }
      });

      if (error) throw error;

      if (data?.success) {
        setTestResult('success');
        toast.success('Mensagem de teste enviada com sucesso!');
      } else {
        throw new Error(data?.error || 'Failed to send message');
      }
    } catch (error) {
      // rm
      setTestResult('error');
      toast.error('Erro ao enviar mensagem. Verifique suas credenciais.');
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

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
              <div className={cn(
                'p-2 rounded-full',
                config.enabled ? 'bg-green-500/10' : 'bg-muted'
              )}>
                <Bell className={cn(
                  'h-5 w-5',
                  config.enabled ? 'text-green-500' : 'text-muted-foreground'
                )} />
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
          <CardDescription>
            Configure seu bot do Telegram para receber alertas
          </CardDescription>
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
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                  Sucesso
                </>
              ) : testResult === 'error' ? (
                <>
                  <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
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
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="create-bot">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Como criar um bot no Telegram?
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Abra o Telegram e procure por <code className="bg-muted px-1 rounded">@BotFather</code></li>
              <li>Envie o comando <code className="bg-muted px-1 rounded">/newbot</code></li>
              <li>Escolha um nome para seu bot (ex: "VISÃO Alertas")</li>
              <li>Escolha um username único terminando em "bot" (ex: "visao_alertas_bot")</li>
              <li>Copie o token fornecido e cole no campo acima</li>
            </ol>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open('https://t.me/BotFather', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir BotFather
            </Button>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="get-chat-id">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Como obter o Chat ID?
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="space-y-3 text-sm text-muted-foreground">
              <p><strong>Para chat pessoal:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Abra o Telegram e procure por <code className="bg-muted px-1 rounded">@userinfobot</code></li>
                <li>Envie qualquer mensagem para ele</li>
                <li>Ele responderá com seu ID</li>
              </ol>

              <p><strong>Para grupos:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Adicione seu bot ao grupo</li>
                <li>Adicione também o <code className="bg-muted px-1 rounded">@userinfobot</code></li>
                <li>Envie uma mensagem no grupo</li>
                <li>O bot mostrará o ID do grupo (começa com -)</li>
              </ol>

              <p><strong>Para canais:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Adicione seu bot como administrador do canal</li>
                <li>Encaminhe uma mensagem do canal para <code className="bg-muted px-1 rounded">@userinfobot</code></li>
                <li>Ele mostrará o ID do canal</li>
              </ol>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open('https://t.me/userinfobot', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir UserInfoBot
            </Button>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="test-bot">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              O que fazer se o teste falhar?
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm text-muted-foreground">
            <p>Verifique os seguintes pontos:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>O token do bot está correto (sem espaços extras)</li>
              <li>Você enviou uma mensagem para o bot antes (isso ativa o chat)</li>
              <li>O Chat ID está correto (grupos começam com -)</li>
              <li>O bot está adicionado ao grupo/canal como administrador</li>
              <li>O bot não está bloqueado ou removido</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Exemplo de mensagem */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Exemplo de Alerta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-[#0f0f0f] rounded-lg p-4 text-white text-sm font-sans">
            <p className="mb-2">🚨 <strong>ALERTA - VISÃO</strong></p>
            <p className="text-gray-300">Tipo: <strong>Pessoa na Blacklist</strong></p>
            <p className="text-gray-300">Câmera: Entrada Principal</p>
            <p className="text-gray-300">Pessoa: João Silva</p>
            <p className="text-gray-300 text-xs mt-2">📅 20/12/2025 14:32:45</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TelegramConfigPanel;
