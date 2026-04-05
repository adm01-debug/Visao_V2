import { UserAvatar } from "@/components/UserAvatar";
import { NotificationBell } from "@/components/NotificationBell";
import { AnalysisHistoryPanel } from "@/components/AnalysisHistoryPanel";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageTitle } from "@/components/Breadcrumbs";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useNotifications } from "@/contexts/NotificationContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Header({ className }: { className?: string }) {
  const isOnline = useOnlineStatus();
  const { isAlertSoundEnabled, toggleAlertSound } = useNotifications();

  return (
    <header className={cn("border-b bg-card/60 backdrop-blur-xl supports-[backdrop-filter]:bg-card/50 sticky top-0 z-30", className)} role="banner" aria-label="Barra de ferramentas principal">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="min-w-0 flex-1 flex items-center gap-4">
          <Breadcrumbs />
          <PageTitle />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span
            className={cn(
              "hidden sm:inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors",
              isOnline ? "text-foreground border-success/30 bg-success/5" : "text-muted-foreground border-border"
            )}
            aria-live="polite"
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
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
                className="h-9 w-9"
                onClick={() => toggleAlertSound(!isAlertSoundEnabled)}
              >
                {isAlertSoundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
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
