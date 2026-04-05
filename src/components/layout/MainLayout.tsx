/**
 * VISÃO - Sistema de Vigilância Inteligente
 * MainLayout - Layout principal da aplicação
 * Re-exporta do layouts para manter compatibilidade
 */

import { ReactNode } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { SwipeableView } from '@/components/SwipeableView';
import { SectionErrorBoundary } from '@/components/layout/SectionErrorBoundary';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';
import { ShortcutsHelpDialog } from '@/components/ShortcutsHelpDialog';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { showHelp, setShowHelp, getShortcutsByCategory, formatShortcut } = useGlobalShortcuts();

  return (
    <div className="flex h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
      >
        Pular para conteúdo principal
      </a>
      <SectionErrorBoundary section="Sidebar">
        <Sidebar />
      </SectionErrorBoundary>
      <div className="flex flex-1 flex-col overflow-hidden">
        <SectionErrorBoundary section="Header">
          <Header />
        </SectionErrorBoundary>
        <SwipeableView className="flex-1 overflow-auto">
          <main id="main-content" className="p-4 md:p-6 pb-20 md:pb-6 min-h-full" role="main" aria-label="Conteúdo principal">
            <SectionErrorBoundary section="Conteúdo Principal">
              {children}
            </SectionErrorBoundary>
          </main>
        </SwipeableView>
      </div>
      <SectionErrorBoundary section="Navegação">
        <BottomNavigation />
      </SectionErrorBoundary>
      <ShortcutsHelpDialog
        open={showHelp}
        onOpenChange={setShowHelp}
        shortcutsByCategory={getShortcutsByCategory()}
        formatShortcut={formatShortcut}
      />
    </div>
  );
}

export function PageContent({ children }: MainLayoutProps) {
  return <div className="space-y-6">{children}</div>;
}

export default MainLayout;
