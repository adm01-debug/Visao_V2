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

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <SwipeableView className="flex-1 overflow-auto">
          <main className="p-4 md:p-6 pb-20 md:pb-6 min-h-full" role="main" aria-label="Conteúdo principal">{children}</main>
        </SwipeableView>
      </div>
      <BottomNavigation />
    </div>
  );
}

export function PageContent({ children }: MainLayoutProps) {
  return <div className="space-y-6">{children}</div>;
}

export default MainLayout;
