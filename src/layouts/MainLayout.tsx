import { ReactNode } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';

interface MainLayoutProps { children: ReactNode; }

export const MainLayout = ({ children }: MainLayoutProps) => (
  <div className="flex h-screen bg-background">
    <Sidebar />
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">{children}</main>
    </div>
    <BottomNavigation />
  </div>
);
