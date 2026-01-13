/**
 * VISÃO - Sidebar Footer Component
 */

import { memo } from "react";
import { Moon, Sun, HelpCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
    <div className="p-3 border-t space-y-1">
      <Separator className="my-2" />

      {/* Theme Toggle */}
      <Button
        variant="ghost"
        size={collapsed && !isMobile ? "icon" : "default"}
        className={cn("w-full", showFullContent && "justify-start gap-3")}
        onClick={toggleTheme}
        title={resolvedTheme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
      >
        {resolvedTheme === "dark" ? (
          <Sun className="w-4 h-4" />
        ) : (
          <Moon className="w-4 h-4" />
        )}
        {showFullContent && (
          <span>{resolvedTheme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>
        )}
      </Button>

      {/* Offline/Online Status */}
      {collapsed && !isMobile ? (
        <div className="flex justify-center py-2">
          <OfflineIndicator variant="minimal" />
        </div>
      ) : (
        <OfflineIndicator variant="full" className="w-full justify-start" />
      )}

      {/* Help / Tour */}
      {showFullContent ? (
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={handleShowTour}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Ver Tour</span>
        </Button>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-full"
              onClick={handleShowTour}
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Ver Tour</TooltipContent>
        </Tooltip>
      )}

      {/* User / Logout */}
      {user && (
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3",
            collapsed && !isMobile && "justify-center px-2"
          )}
          onClick={() => signOut?.()}
        >
          <LogOut className="w-4 h-4" />
          {showFullContent && <span>Sair</span>}
        </Button>
      )}
    </div>
  );
});
