/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Configurações do Telegram
 */

import { PageMeta } from '@/components/PageMeta';
import { Sidebar } from '@/components/Sidebar';
import { TelegramConfigPanel } from '@/components/TelegramConfigPanel';

export default function TelegramSettingsPage() {

  return (
    <>
      <PageMeta title="Configurações Telegram" description="Configure notificações via Telegram" />

      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <TelegramConfigPanel />
        </main>
      </div>
    </>
  );
}
