import { ReactNode } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { SwipeableView } from '@/components/SwipeableView';
import { PWAMigrationBanner } from '@/components/PWAMigrationBanner';

interface MainLayoutProps { children: ReactNode; }

export const MainLayout = ({ children }: MainLayoutProps) => (
  <div className="flex h-screen h-dvh bg-background">
    <Sidebar />
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header />
      <SwipeableView className="flex-1 overflow-auto" data-app-scroll>
        <PWAMigrationBanner />
        <main className="p-4 md:p-6 mb-mobile-nav min-h-full">{children}</main>
      </SwipeableView>
    </div>
    <BottomNavigation />
  </div>
);
