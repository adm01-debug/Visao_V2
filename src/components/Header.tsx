import { UserAvatar } from "@/components/UserAvatar";
import { NotificationBell } from "@/components/NotificationBell";
import { AnalysisHistoryPanel } from "@/components/AnalysisHistoryPanel";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageTitle } from "@/components/Breadcrumbs";
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

export function Header({ className }: { className?: string }) {
  const isOnline = useOnlineStatus();
  const { isAlertSoundEnabled, toggleAlertSound } = useNotifications();
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <header className={cn("border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30", className)} role="banner" aria-label="Barra de ferramentas principal">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="min-w-0 flex-1 flex items-center gap-4">
          <Breadcrumbs />
          <PageTitle />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <span
            className={cn(
              "hidden sm:inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition-colors",
              isOnline ? "text-foreground/80 border-success/20 bg-success/[0.08]" : "text-muted-foreground border-border/60 bg-muted/30"
            )}
            aria-live="polite"
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors",
                isOnline ? "bg-success animate-pulse" : "bg-muted-foreground"
              )}
              aria-hidden="true"
            />
            {isOnline ? "Online" : "Offline"}
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95"
                onClick={toggleTheme}
                aria-label={resolvedTheme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
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
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground transition-all duration-200"
                onClick={() => toggleAlertSound(!isAlertSoundEnabled)}
              >
                {isAlertSoundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isAlertSoundEnabled ? "Som de alertas ativo" : "Som de alertas desativado"}
            </TooltipContent>
          </Tooltip>

          <AnalysisHistoryPanel />
          <NotificationBell />
          <UserAvatar />
        </div>
      </div>
    </header>
  );
}

export default Header;
