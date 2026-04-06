/**
 * VISÃO - Sidebar Footer Component - Premium
 */

import React, { memo } from "react";
import { Moon, Sun, HelpCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeProvider";
import { cn } from "@/lib/utils";

interface SidebarFooterProps {
  collapsed: boolean;
  isMobile: boolean;
}

export const SidebarFooter = memo(React.forwardRef(function SidebarFooter({
  collapsed,
  isMobile,
}: SidebarFooterProps, _ref) {
  const { user, signOut } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  const showFullContent = !collapsed || isMobile;

  const handleShowTour = () => {
    localStorage.removeItem("visao-onboarding-v1");
    window.location.reload();
  };

  const footerButtonClasses = cn(
    "w-full text-muted-foreground/70",
    "transition-all duration-200",
    "hover:text-sidebar-foreground hover:bg-sidebar-accent/40",
    "rounded-xl"
  );

  return (
    <div className="p-3 border-t border-sidebar-border/30 space-y-0.5">
      <Button
        variant="ghost"
        size={collapsed && !isMobile ? "icon" : "default"}
        className={cn(
          footerButtonClasses,
          showFullContent && "justify-start gap-3"
        )}
        onClick={toggleTheme}
        title={resolvedTheme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
      >
        {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        {showFullContent && (
          <span className="text-sm">{resolvedTheme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>
        )}
      </Button>

      {collapsed && !isMobile ? (
        <div className="flex justify-center py-1.5">
          <OfflineIndicator variant="minimal" />
        </div>
      ) : (
        <OfflineIndicator variant="full" className="w-full justify-start" />
      )}

      {showFullContent ? (
        <Button variant="ghost" className={cn(footerButtonClasses, "justify-start gap-3")} onClick={handleShowTour}>
          <HelpCircle className="w-4 h-4" />
          <span className="text-sm">Ver Tour</span>
        </Button>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className={footerButtonClasses} onClick={handleShowTour}>
              <HelpCircle className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Ver Tour</TooltipContent>
        </Tooltip>
      )}

      {user && (
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 rounded-xl",
            "text-muted-foreground/70 transition-all duration-200",
            "hover:text-[hsl(var(--severity-critical))] hover:bg-[hsl(var(--severity-critical))]/8",
            collapsed && !isMobile && "justify-center px-2"
          )}
          onClick={() => signOut?.()}
        >
          <LogOut className="w-4 h-4" />
          {showFullContent && <span className="text-sm">Sair</span>}
        </Button>
      )}
    </div>
  );
});
