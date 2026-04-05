/**
 * VISÃO - Sidebar Header Component
 */

import { memo } from "react";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";
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
        "flex items-center h-16 px-4 border-b border-sidebar-border/60",
        "bg-sidebar/80 backdrop-blur-sm",
        collapsed && !isMobile ? "justify-center" : "justify-between"
      )}
    >
      {(!collapsed || isMobile) && (
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 ring-1 ring-primary/20">
            <Eye className="w-4.5 h-4.5 text-primary" />
          </div>
          <span className="font-bold text-lg tracking-tight text-sidebar-foreground">VISÃO</span>
        </div>
      )}

      {collapsed && !isMobile && (
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 ring-1 ring-primary/20">
          <Eye className="w-4.5 h-4.5 text-primary" />
        </div>
      )}

      {!isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
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
