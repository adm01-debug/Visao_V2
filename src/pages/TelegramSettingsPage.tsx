/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Configurações do Telegram
 */

import { Helmet } from 'react-helmet-async';
import { Sidebar } from '@/components/Sidebar';
import { TelegramConfigPanel } from '@/components/TelegramConfigPanel';
import { useI18n } from '@/contexts/i18n';

export default function TelegramSettingsPage() {
  const { t } = useI18n();

  return (
    <>
      <Helmet>
        <title>Alertas Telegram | VISÃO</title>
        <meta name="description" content="Configure alertas automáticos via Telegram" />
      </Helmet>
      
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <TelegramConfigPanel />
        </main>
      </div>
    </>
  );
}
