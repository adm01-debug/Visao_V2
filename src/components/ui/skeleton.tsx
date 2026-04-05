import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted relative overflow-hidden",
        "after:absolute after:inset-0 after:translate-x-[-100%]",
        "after:bg-gradient-to-r after:from-transparent after:via-primary/5 after:to-transparent",
        "after:animate-[shimmer_2s_infinite]",
        className
      )}
      {...props}
    />
  );
}

/** Branded skeleton for stats cards */
function StatSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass-card p-5 space-y-3", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-12 w-12 rounded-xl" />
      </div>
    </div>
  );
}

/** Branded skeleton for alert cards */
function AlertSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass-card p-4", className)}>
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
    </div>
  );
}

/** Branded skeleton for camera cards */
function CameraSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass-card overflow-hidden", className)}>
      <Skeleton className="aspect-video w-full" />
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export { Skeleton, StatSkeleton, AlertSkeleton, CameraSkeleton };
