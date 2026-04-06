/**
 * VISÃO - Sidebar Content Component
 * Shared content for both desktop and mobile sidebars
 */

import React, { memo } from "react";
import { cn } from "@/lib/utils";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarNav } from "./SidebarNav";
import { SidebarFooter } from "./SidebarFooter";
import { SearchTrigger } from "./SearchTrigger";
import type { UseSidebarStateReturn } from "../hooks/useSidebarState";

interface SidebarContentProps {
  state: UseSidebarStateReturn;
  isMobile?: boolean;
}

export const SidebarContent = memo(React.forwardRef(function SidebarContent({
  state,
  isMobile = false,
}: SidebarContentProps, _ref) {
  const {
    collapsed,
    categories,
    expandedCategories,
    toggleCollapsed,
    toggleCategory,
    isItemActive,
    setSearchOpen,
    closeMobile,
  } = state;

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-sidebar",
        !isMobile && "border-r border-sidebar-border/30",
        !isMobile && (collapsed ? "w-16" : "w-64"),
        "transition-all duration-300 ease-out"
      )}
    >
      {/* Header */}
      <SidebarHeader
        collapsed={collapsed}
        isMobile={isMobile}
        onToggle={toggleCollapsed}
      />

      {/* Search Trigger */}
      <div className={cn("px-3 py-2", collapsed && !isMobile && "px-2")}>
        <SearchTrigger
          collapsed={collapsed && !isMobile}
          onClick={() => setSearchOpen(true)}
        />
      </div>

      {/* Navigation */}
      <SidebarNav
        categories={categories}
        collapsed={collapsed}
        isMobile={isMobile}
        expandedCategories={expandedCategories}
        onToggleCategory={toggleCategory}
        isItemActive={isItemActive}
        onNavigate={isMobile ? closeMobile : undefined}
      />

      {/* Footer */}
      <SidebarFooter collapsed={collapsed} isMobile={isMobile} />
    </div>
  );
}));
