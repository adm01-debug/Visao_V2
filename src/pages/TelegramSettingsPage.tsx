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
      <TelegramConfigPanel />
    </PageContent>
  );
}
