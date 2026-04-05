/**
 * VISÃO - Sidebar Footer Component
 */

import { memo } from "react";
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

export const SidebarFooter = memo(function SidebarFooter({
  collapsed,
  isMobile,
}: SidebarFooterProps) {
  const { user, signOut } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  const showFullContent = !collapsed || isMobile;

  const handleShowTour = () => {
    localStorage.removeItem("visao-onboarding-v1");
    window.location.reload();
  };

  return (
    <div className="p-3 border-t border-sidebar-border/40 space-y-0.5">
      <Button
        variant="ghost"
        size={collapsed && !isMobile ? "icon" : "default"}
        className={cn(
          "w-full text-muted-foreground hover:text-sidebar-foreground",
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
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-sidebar-foreground" onClick={handleShowTour}>
          <HelpCircle className="w-4 h-4" />
          <span className="text-sm">Ver Tour</span>
        </Button>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-full text-muted-foreground hover:text-sidebar-foreground" onClick={handleShowTour}>
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
            "w-full justify-start gap-3 text-muted-foreground hover:text-destructive",
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
