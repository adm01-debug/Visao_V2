/**
 * VISÃO - Sidebar Header Component
 */

import { memo } from "react";
import { Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarHeaderProps {
  collapsed: boolean;
  isMobile: boolean;
  onToggle: () => void;
}

export const SidebarHeader = memo(function SidebarHeader({
  collapsed,
  isMobile,
  onToggle,
}: SidebarHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center h-14 px-4 border-b border-sidebar-border/40",
        collapsed && !isMobile ? "justify-center" : "justify-between"
      )}
    >
      {(!collapsed || isMobile) && (
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/25 transition-transform duration-300 hover:scale-110">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-wide text-sidebar-foreground">VISÃO</span>
            <span className="text-[10px] text-muted-foreground leading-none">Vigilância Inteligente</span>
          </div>
        </div>
      )}

      {collapsed && !isMobile && (
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Shield className="w-4 h-4" />
        </div>
      )}

      {!isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed && "hidden md:flex"
          )}
          onClick={onToggle}
          data-testid="sidebar-toggle"
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </Button>
      )}
    </div>
  );
});
