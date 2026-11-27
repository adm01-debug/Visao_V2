import { ReactNode } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { SwipeableView } from '@/components/SwipeableView';
import { PWAMigrationBanner } from '@/components/PWAMigrationBanner';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => (
  <div className="flex h-screen h-dvh bg-background">
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
    >
      Ir para o conteúdo principal
    </a>
    <Sidebar />
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header />
      <SwipeableView className="flex-1 overflow-auto" data-app-scroll tabIndex={0}>
        <PWAMigrationBanner />
        <main id="main-content" tabIndex={-1} className="p-4 md:p-6 mb-mobile-nav min-h-full">
          {children}
        </main>
      </SwipeableView>
    </div>
    <BottomNavigation />
  </div>
);
