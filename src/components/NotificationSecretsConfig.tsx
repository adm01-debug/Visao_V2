/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: NotificationSecretsConfig
 * 
 * Interface para configurar e testar secrets de notificações:
 * - Resend (Email)
 * - Evolution API (WhatsApp)
 * - Telegram Bot
 * - Webhook URLs
 */

import { useState, useCallback } from 'react';
import {
  Mail,
  MessageSquare,
  Send,
  Webhook,
  Key,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  AlertTriangle,
  Info,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

interface SecretStatus {
  configured: boolean;
  tested: boolean;
  lastTest?: Date;
  error?: string;
}

interface SecretsConfig {
  resend: {
    apiKey: string;
    fromEmail: string;
    fromName: string;
  };
  evolution: {
    apiUrl: string;
    apiKey: string;
    instanceName: string;
  };
  telegram: {
    botToken: string;
    defaultChatId: string;
  };
  webhook: {
    url: string;
    secret: string;
  };
}

// ============================================
// CONFIGURAÇÕES DOS PROVEDORES
// ============================================

const providerInfo = {
  resend: {
    name: 'Resend',
    description: 'Serviço de envio de emails transacionais',
    icon: Mail,
    color: 'text-blue-500',
    docsUrl: 'https://resend.com/docs',
    envVars: ['RESEND_API_KEY'],
  },
  evolution: {
    name: 'Evolution API',
    description: 'API para envio de mensagens via WhatsApp',
    icon: MessageSquare,
    color: 'text-green-500',
    docsUrl: 'https://doc.evolution-api.com/',
    envVars: ['EVOLUTION_API_URL', 'EVOLUTION_API_KEY', 'EVOLUTION_INSTANCE'],
  },
  telegram: {
    name: 'Telegram Bot',
    description: 'Bot para notificações via Telegram',
    icon: Send,
    color: 'text-sky-500',
    docsUrl: 'https://core.telegram.org/bots/api',
    envVars: ['TELEGRAM_BOT_TOKEN'],
  },
  webhook: {
    name: 'Webhook Genérico',
    description: 'Endpoint HTTP para integração customizada',
    icon: Webhook,
    color: 'text-purple-500',
    docsUrl: null,
    envVars: ['WEBHOOK_URL', 'WEBHOOK_SECRET'],
  },
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function NotificationSecretsConfig() {
  const [secrets, setSecrets] = useState<SecretsConfig>({
    resend: { apiKey: '', fromEmail: '', fromName: 'VISÃO Alertas' },
    evolution: { apiUrl: '', apiKey: '', instanceName: '' },
    telegram: { botToken: '', defaultChatId: '' },
    webhook: { url: '', secret: '' },
  });

  const [status, setStatus] = useState<Record<string, SecretStatus>>({
    resend: { configured: false, tested: false },
    evolution: { configured: false, tested: false },
    telegram: { configured: false, tested: false },
    webhook: { configured: false, tested: false },
  });

  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Toggle visibilidade de secret
  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Copiar para clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  // Testar Resend
  const testResend = async () => {
    setTesting('resend');
    try {
      const { data, error } = await supabase.functions.invoke('send-alert-notification', {
        body: {
          test: true,
          provider: 'email',
          to: secrets.resend.fromEmail,
          subject: 'Teste VISÃO - Email',
          body: 'Este é um teste do sistema de notificações VISÃO.',
        },
      });

      if (error) throw error;
      
      setStatus(prev => ({
        ...prev,
        resend: { configured: true, tested: true, lastTest: new Date() },
      }));
      toast.success('Email de teste enviado com sucesso!');
    } catch (error: unknown) {
      setStatus(prev => ({
        ...prev,
        resend: { configured: true, tested: false, error: error.message },
      }));
      toast.error(`Erro: ${error.message}`);
    } finally {
      setTesting(null);
    }
  };

  // Testar Evolution
  const testEvolution = async () => {
    setTesting('evolution');
    try {
      const { data, error } = await supabase.functions.invoke('send-alert-notification', {
        body: {
          test: true,
          provider: 'whatsapp',
          message: '🔔 Teste VISÃO - WhatsApp funcionando!',
        },
      });

      if (error) throw error;
      
      setStatus(prev => ({
        ...prev,
        evolution: { configured: true, tested: true, lastTest: new Date() },
      }));
      toast.success('Mensagem WhatsApp enviada com sucesso!');
    } catch (error: unknown) {
      setStatus(prev => ({
        ...prev,
        evolution: { configured: true, tested: false, error: error.message },
      }));
      toast.error(`Erro: ${error.message}`);
    } finally {
      setTesting(null);
    }
  };

  // Testar Telegram
  const testTelegram = async () => {
    setTesting('telegram');
    try {
      const { data, error } = await supabase.functions.invoke('send-telegram', {
        body: {
          message: '🔔 Teste VISÃO - Telegram funcionando!',
          chat_id: secrets.telegram.defaultChatId,
        },
      });

      if (error) throw error;
      
      setStatus(prev => ({
        ...prev,
        telegram: { configured: true, tested: true, lastTest: new Date() },
      }));
      toast.success('Mensagem Telegram enviada com sucesso!');
    } catch (error: unknown) {
      setStatus(prev => ({
        ...prev,
        telegram: { configured: true, tested: false, error: error.message },
      }));
      toast.error(`Erro: ${error.message}`);
    } finally {
      setTesting(null);
    }
  };

  // Testar Webhook
  const testWebhook = async () => {
    setTesting('webhook');
    try {
      const response = await fetch(secrets.webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': secrets.webhook.secret,
        },
        body: JSON.stringify({
          type: 'test',
          message: 'Teste VISÃO - Webhook',
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      setStatus(prev => ({
        ...prev,
        webhook: { configured: true, tested: true, lastTest: new Date() },
      }));
      toast.success('Webhook testado com sucesso!');
    } catch (error: unknown) {
      setStatus(prev => ({
        ...prev,
        webhook: { configured: true, tested: false, error: error.message },
      }));
      toast.error(`Erro: ${error.message}`);
    } finally {
      setTesting(null);
    }
  };

  // Salvar configurações
  const saveSecrets = async () => {
    setSaving(true);
    try {
      // Em produção, estas configurações seriam salvas como secrets do Supabase
      // Por segurança, não salvamos diretamente no frontend
      
      localStorage.setItem('visao-notification-config', JSON.stringify({
        resend: { fromEmail: secrets.resend.fromEmail, fromName: secrets.resend.fromName },
        evolution: { instanceName: secrets.evolution.instanceName },
        telegram: { defaultChatId: secrets.telegram.defaultChatId },
        webhook: { url: secrets.webhook.url },
      }));

      toast.success('Configurações salvas localmente');
      toast.info('Para configurar secrets de produção, acesse o painel Supabase');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Aviso de segurança */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Importante</AlertTitle>
        <AlertDescription>
          As chaves API devem ser configuradas como secrets no painel do Supabase para segurança.
          Os valores inseridos aqui são apenas para teste e não são salvos permanentemente.
        </AlertDescription>
      </Alert>

      {/* Status geral */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(providerInfo).map(([key, info]) => {
          const s = status[key];
          const Icon = info.icon;
          
          return (
            <Card key={key} className="relative">
              <CardContent className="pt-6 text-center">
                <Icon className={cn('w-8 h-8 mx-auto mb-2', info.color)} />
                <p className="font-medium text-sm">{info.name}</p>
                <div className="mt-2">
                  {s.tested ? (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="w-3 h-3 mr-1" /> Funcionando
                    </Badge>
                  ) : s.configured ? (
                    <Badge variant="secondary">
                      <AlertTriangle className="w-3 h-3 mr-1" /> Não testado
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <XCircle className="w-3 h-3 mr-1" /> Não configurado
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Configurações detalhadas */}
      <Accordion type="single" collapsible className="space-y-4">
        {/* Resend */}
        <AccordionItem value="resend" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-500" />
              <span>Resend (Email)</span>
              {status.resend.tested && <Badge variant="default" className="bg-green-500 text-xs">OK</Badge>}
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="grid gap-4">
              <div>
                <Label>API Key</Label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <Input
                      type={showSecrets.resend ? 'text' : 'password'}
                      value={secrets.resend.apiKey}
                      onChange={(e) => setSecrets(prev => ({ 
                        ...prev, 
                        resend: { ...prev.resend, apiKey: e.target.value } 
                      }))}
                      placeholder="re_..."
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-7 w-7"
                      onClick={() => toggleSecret('resend')}
                    >
                      {showSecrets.resend ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email de Origem</Label>
                  <Input
                    type="email"
                    value={secrets.resend.fromEmail}
                    onChange={(e) => setSecrets(prev => ({ 
                      ...prev, 
                      resend: { ...prev.resend, fromEmail: e.target.value } 
                    }))}
                    placeholder="alertas@seudominio.com"
                  />
                </div>
                <div>
                  <Label>Nome do Remetente</Label>
                  <Input
                    value={secrets.resend.fromName}
                    onChange={(e) => setSecrets(prev => ({ 
                      ...prev, 
                      resend: { ...prev.resend, fromName: e.target.value } 
                    }))}
                    placeholder="VISÃO Alertas"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <a 
                href="https://resend.com/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:underline flex items-center gap-1"
              >
                Obter API Key <ExternalLink className="w-3 h-3" />
              </a>
              <Button 
                onClick={testResend} 
                disabled={!secrets.resend.apiKey || testing === 'resend'}
              >
                {testing === 'resend' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Testar Email
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Evolution API */}
        <AccordionItem value="evolution" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-green-500" />
              <span>Evolution API (WhatsApp)</span>
              {status.evolution.tested && <Badge variant="default" className="bg-green-500 text-xs">OK</Badge>}
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="grid gap-4">
              <div>
                <Label>URL da API</Label>
                <Input
                  value={secrets.evolution.apiUrl}
                  onChange={(e) => setSecrets(prev => ({ 
                    ...prev, 
                    evolution: { ...prev.evolution, apiUrl: e.target.value } 
                  }))}
                  placeholder="https://api.evolution.com.br"
                />
              </div>
              <div>
                <Label>API Key</Label>
                <div className="relative">
                  <Input
                    type={showSecrets.evolution ? 'text' : 'password'}
                    value={secrets.evolution.apiKey}
                    onChange={(e) => setSecrets(prev => ({ 
                      ...prev, 
                      evolution: { ...prev.evolution, apiKey: e.target.value } 
                    }))}
                    placeholder="Sua API Key"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-7 w-7"
                    onClick={() => toggleSecret('evolution')}
                  >
                    {showSecrets.evolution ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label>Nome da Instância</Label>
                <Input
                  value={secrets.evolution.instanceName}
                  onChange={(e) => setSecrets(prev => ({ 
                    ...prev, 
                    evolution: { ...prev.evolution, instanceName: e.target.value } 
                  }))}
                  placeholder="visao-instance"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <a 
                href="https://doc.evolution-api.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:underline flex items-center gap-1"
              >
                Documentação <ExternalLink className="w-3 h-3" />
              </a>
              <Button 
                onClick={testEvolution} 
                disabled={!secrets.evolution.apiKey || testing === 'evolution'}
              >
                {testing === 'evolution' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Testar WhatsApp
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Telegram */}
        <AccordionItem value="telegram" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Send className="w-5 h-5 text-sky-500" />
              <span>Telegram Bot</span>
              {status.telegram.tested && <Badge variant="default" className="bg-green-500 text-xs">OK</Badge>}
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="grid gap-4">
              <div>
                <Label>Bot Token</Label>
                <div className="relative">
                  <Input
                    type={showSecrets.telegram ? 'text' : 'password'}
                    value={secrets.telegram.botToken}
                    onChange={(e) => setSecrets(prev => ({ 
                      ...prev, 
                      telegram: { ...prev.telegram, botToken: e.target.value } 
                    }))}
                    placeholder="123456:ABC-DEF..."
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-7 w-7"
                    onClick={() => toggleSecret('telegram')}
                  >
                    {showSecrets.telegram ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Obtenha com @BotFather no Telegram
                </p>
              </div>
              <div>
                <Label>Chat ID Padrão</Label>
                <Input
                  value={secrets.telegram.defaultChatId}
                  onChange={(e) => setSecrets(prev => ({ 
                    ...prev, 
                    telegram: { ...prev.telegram, defaultChatId: e.target.value } 
                  }))}
                  placeholder="-1001234567890"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use @userinfobot para descobrir seu Chat ID
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button 
                onClick={testTelegram} 
                disabled={!secrets.telegram.botToken || !secrets.telegram.defaultChatId || testing === 'telegram'}
              >
                {testing === 'telegram' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Testar Telegram
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Webhook */}
        <AccordionItem value="webhook" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Webhook className="w-5 h-5 text-purple-500" />
              <span>Webhook Customizado</span>
              {status.webhook.tested && <Badge variant="default" className="bg-green-500 text-xs">OK</Badge>}
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="grid gap-4">
              <div>
                <Label>URL do Webhook</Label>
                <Input
                  value={secrets.webhook.url}
                  onChange={(e) => setSecrets(prev => ({ 
                    ...prev, 
                    webhook: { ...prev.webhook, url: e.target.value } 
                  }))}
                  placeholder="https://seu-servidor.com/webhook"
                />
              </div>
              <div>
                <Label>Secret (opcional)</Label>
                <div className="relative">
                  <Input
                    type={showSecrets.webhook ? 'text' : 'password'}
                    value={secrets.webhook.secret}
                    onChange={(e) => setSecrets(prev => ({ 
                      ...prev, 
                      webhook: { ...prev.webhook, secret: e.target.value } 
                    }))}
                    placeholder="Chave para validação"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-7 w-7"
                    onClick={() => toggleSecret('webhook')}
                  >
                    {showSecrets.webhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button 
                onClick={testWebhook} 
                disabled={!secrets.webhook.url || testing === 'webhook'}
              >
                {testing === 'webhook' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Testar Webhook
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Instruções para Supabase */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="w-4 h-4" />
            Configurar Secrets no Supabase
          </CardTitle>
          <CardDescription>
            Para produção, configure os secrets no painel do Supabase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <pre className="text-xs overflow-auto">
{`# No Supabase Dashboard > Settings > Edge Functions > Secrets

RESEND_API_KEY=re_xxxxxxxxxxxx
EVOLUTION_API_URL=https://api.evolution.com.br
EVOLUTION_API_KEY=xxxxxxxxxxxx
EVOLUTION_INSTANCE=visao-instance
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...`}
            </pre>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => copyToClipboard(`RESEND_API_KEY=
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE=
TELEGRAM_BOT_TOKEN=`)}
            >
              <Copy className="w-3 h-3 mr-1" /> Copiar template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Botão salvar */}
      <div className="flex justify-end">
        <Button onClick={saveSecrets} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}

export default NotificationSecretsConfig;
