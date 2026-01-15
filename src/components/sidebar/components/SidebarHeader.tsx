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
        "flex items-center h-16 px-4 border-b",
        collapsed && !isMobile ? "justify-center" : "justify-between"
      )}
    >
      {(!collapsed || isMobile) && (
        <div className="flex items-center gap-2">
          <Eye className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg">VISÃO</span>
        </div>
      )}

      {collapsed && !isMobile && <Eye className="w-6 h-6 text-primary" />}

      {!isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", collapsed && "hidden md:flex")}
          onClick={onToggle}
          data-testid="sidebar-toggle"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      )}
    </div>
  );
});
