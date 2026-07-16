import React from "react";
import { UserAvatar } from "@/components/UserAvatar";
import { NotificationBell } from "@/components/NotificationBell";
import { AnalysisHistoryPanel } from "@/components/AnalysisHistoryPanel";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageTitle } from "@/components/Breadcrumbs";
import { BackButton } from "@/components/ui/BackButton";
import { CronStaleBadge } from "@/components/admin/CronStaleBadge";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useNotifications } from "@/contexts/NotificationContext";
import { useTheme } from "@/contexts/ThemeProvider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Moon, Sun } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const Header = React.forwardRef<HTMLElement, { className?: string }>(function Header({ className }, _ref) {
  const isOnline = useOnlineStatus();
  const { isAlertSoundEnabled, toggleAlertSound } = useNotifications();
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <header className={cn(
      "border-b border-border/40 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70",
      "sticky top-0 z-30",
      className
    )} role="banner" aria-label="Barra de ferramentas principal">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <BackButton />
          <Breadcrumbs />
          <PageTitle />
        </div>

        <div className="flex items-center gap-1">
          <span
            className={cn(
              "hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              isOnline
                ? "text-success bg-success/8"
                : "text-muted-foreground bg-muted/50"
            )}
            aria-live="polite"
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isOnline ? "bg-success animate-pulse" : "bg-muted-foreground"
              )}
              aria-hidden="true"
            />
            {isOnline ? "Online" : "Offline"}
          </span>

          <CronStaleBadge className="hidden md:inline-flex" />


          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={toggleTheme}
                aria-label={resolvedTheme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
              >
                {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {resolvedTheme === "dark" ? "Modo Claro" : "Modo Escuro"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => toggleAlertSound(!isAlertSoundEnabled)}
              >
                {isAlertSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isAlertSoundEnabled ? "Som ativo" : "Som desativado"}
            </TooltipContent>
          </Tooltip>

          <AnalysisHistoryPanel />
          <NotificationBell />
          <UserAvatar />
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'Header';

export default Header;
