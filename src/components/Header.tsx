import { UserAvatar } from "@/components/UserAvatar";
import { NotificationBell } from "@/components/NotificationBell";
import { Breadcrumbs } from "@/components/Breadcrumbs";
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
    <header className={cn("border-b bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50", className)}>
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <Breadcrumbs />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span
            className={cn(
              "hidden sm:inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
              isOnline ? "text-foreground" : "text-muted-foreground"
            )}
            aria-live="polite"
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isOnline ? "bg-emerald-500" : "bg-muted-foreground"
              )}
              aria-hidden="true"
            />
            {isOnline ? "Online" : "Offline"}
          </span>

          {/* Sound Toggle */}
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

          <NotificationBell />
          <UserAvatar />
        </div>
      </div>
    </header>
  );
}

export default Header;
