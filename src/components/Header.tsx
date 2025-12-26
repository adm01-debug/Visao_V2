import { UserAvatar } from "@/components/UserAvatar";
import { NotificationBell } from "@/components/NotificationBell";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";

export function Header({ className }: { className?: string }) {
  const isOnline = useOnlineStatus();

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

          <NotificationBell />
          <UserAvatar />
        </div>
      </div>
    </header>
  );
}

export default Header;
