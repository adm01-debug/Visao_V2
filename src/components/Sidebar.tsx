/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Sidebar Principal - Refatorado em componentes modulares
 */

import { memo } from "react";
import { cn } from "@/lib/utils";
import { useSidebarState } from "./hooks/useSidebarState";
import { SidebarContent, SidebarMobile, QuickSearchDialog } from "./components";

interface SidebarProps {
  className?: string;
}

function Sidebar({ className }: SidebarProps) {
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
        className={cn("hidden md:block h-screen sticky top-0", className)}
      >
        <SidebarContent state={state} />
      </aside>
    </>
  );
}

export default memo(Sidebar);
