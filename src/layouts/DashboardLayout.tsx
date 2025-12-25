import { ReactNode } from 'react';
import { MainLayout } from './MainLayout';

interface DashboardLayoutProps { children: ReactNode; title?: string; }

export const DashboardLayout = ({ children, title }: DashboardLayoutProps) => (
  <MainLayout>
    {title && <h1 className="text-2xl font-bold mb-6">{title}</h1>}
    <div className="grid gap-6">{children}</div>
  </MainLayout>
);
