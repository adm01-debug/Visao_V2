import React from 'react';
import { cn } from '@/lib/utils';
import { LayoutDashboard, BarChart2, Users, Settings, FileText, ShoppingCart, Bell, HelpCircle, TrendingUp } from 'lucide-react';

interface DashboardLayoutProps { children: React.ReactNode; sidebar?: React.ReactNode; topbar?: React.ReactNode; className?: string; }

export function DashboardLayout({ children, sidebar, topbar, className }: DashboardLayoutProps) {
  return (
    <div className={cn('min-h-screen bg-background flex', className)}>
      {sidebar}
      <div className="flex-1 flex flex-col">
        {topbar}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export default DashboardLayout;
