/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Configurações do Telegram
 */

import { PageMeta } from '@/components/PageMeta';
import { PageContent } from '@/components/layout/MainLayout';
import { TelegramConfigPanel } from '@/components/TelegramConfigPanel';

export default function TelegramSettingsPage() {
  return (
    <PageContent>
      <PageMeta title="Configurações Telegram" description="Configure notificações via Telegram" />
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Configurações Telegram</h1>
        <p className="text-sm text-muted-foreground">
          Configure o envio de alertas do sistema para o Telegram
        </p>
      </div>
      <TelegramConfigPanel />
    </PageContent>
  );
}
