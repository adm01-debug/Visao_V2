import React from 'react';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  sidebarWidth?: string;
  sidebarCollapsed?: boolean;
  className?: string;
}

export function PageLayout({ children, sidebar, header, footer, sidebarWidth = '250px', sidebarCollapsed = false, className }: PageLayoutProps) {
  return (
    <div className={cn('min-h-screen flex flex-col', className)}>
      {header}
      <div className="flex flex-1">
        {sidebar && (
          <aside className="border-r bg-background transition-all" style={{ width: sidebarCollapsed ? '60px' : sidebarWidth }}>
            {sidebar}
          </aside>
        )}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      {footer}
    </div>
  );
}

export default PageLayout;
