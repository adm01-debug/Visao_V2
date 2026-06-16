/**
 * VISÃO - Telegram Config Hook
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  sendPhotos: boolean;
  alertTypes: string[];
}

export function useTelegramConfig(onConfigChange?: (config: TelegramConfig) => void) {
  const [config, setConfig] = useState<TelegramConfig>({
    enabled: false,
    botToken: '',
    chatId: '',
    sendPhotos: true,
    alertTypes: ['blacklist', 'critical', 'high'],
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('telegram-config');
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch { /* config corrompida no localStorage; mantém valores padrão */ }
    }
  }, []);

  const saveConfig = () => {
    localStorage.setItem('telegram-config', JSON.stringify(config));
    onConfigChange?.(config);
    toast.success('Configuração do Telegram salva');
  };

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
          message: `🔔 <b>Teste de Conexão - VISÃO</b>\n\n✅ Sua configuração do Telegram está funcionando corretamente!\n\n📅 Data: ${new Date().toLocaleString('pt-BR')}`,
        },
      });

      if (error) throw error;
      if (data?.success) {
        setTestResult('success');
        toast.success('Mensagem de teste enviada com sucesso!');
      } else {
        throw new Error(data?.error || 'Failed to send message');
      }
    } catch {
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

  return { config, setConfig, testing, testResult, saveConfig, testConnection, copyToClipboard };
}
