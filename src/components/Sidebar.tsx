/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Sidebar Principal - Refatorado em componentes modulares
 */

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { useSidebarState } from './sidebar/hooks/useSidebarState';
import { SidebarContent, SidebarMobile, QuickSearchDialog } from './sidebar/components';

interface SidebarProps {
  className?: string;
}

function SidebarComponent({ className }: SidebarProps) {
  const state = useSidebarState();

  return (
    <>
      {/* Quick Search Dialog (Cmd+K) */}
      <QuickSearchDialog
        open={state.searchOpen}
        onOpenChange={state.setSearchOpen}
        categories={state.categories}
        onNavigate={state.handleNavigate}
      />

      {/* Mobile - Sheet Drawer */}
      <SidebarMobile state={state} />

      {/* Desktop - Sidebar fixa */}
      <aside
        data-testid="sidebar"
        className={cn('hidden md:block h-screen sticky top-0', className)}
      >
        <SidebarContent state={state} />
      </aside>
    </>
  );
}

export const Sidebar = memo(SidebarComponent);
export default Sidebar;
