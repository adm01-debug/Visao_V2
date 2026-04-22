import React from "react";
import { cn } from "@/lib/utils";
import { Shield } from "lucide-react";

/**
 * Skeleton primitivo. Sempre renderiza com dimensões estáticas:
 * - `flex-shrink-0` impede que pais flex colapsem o tamanho
 * - `style={{ aspectRatio }}` opcional trava proporção até o conteúdo chegar
 * - Consumidores devem passar `h-*`/`w-*` (ou aspectRatio) para reserva fixa
 */
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Trava a proporção (ex: "16 / 9", "1 / 1") via CSS aspect-ratio. */
  aspectRatio?: React.CSSProperties['aspectRatio'];
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  { className, aspectRatio, style, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        "rounded-md bg-muted relative overflow-hidden flex-shrink-0",
        "after:absolute after:inset-0 after:translate-x-[-100%]",
        "after:bg-gradient-to-r after:from-transparent after:via-primary/10 after:to-transparent",
        "after:animate-shimmer",
        className
      )}
      style={aspectRatio ? { aspectRatio, ...style } : style}
      {...props}
    />
  );
});

Skeleton.displayName = 'Skeleton';

/** Branded skeleton with VISÃO watermark for larger areas */
interface BrandedSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  aspectRatio?: React.CSSProperties['aspectRatio'];
}
function BrandedSkeleton({ className, aspectRatio, style, ...props }: BrandedSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-md bg-muted relative overflow-hidden flex-shrink-0",
        "after:absolute after:inset-0 after:translate-x-[-100%]",
        "after:bg-gradient-to-r after:from-transparent after:via-primary/10 after:to-transparent",
        "after:animate-shimmer",
        className
      )}
      style={aspectRatio ? { aspectRatio, ...style } : style}
      {...props}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-skeleton-brand-pulse">
        {Shield ? (
          <Shield className="w-8 h-8 text-primary" />
        ) : (
          <div className="w-8 h-8 rounded bg-muted-foreground/20" />
        )}
      </div>
    </div>
  );
}

/** Branded skeleton for stats cards */
function StatSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("glass-card p-5 space-y-3", className)}>
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
    <div aria-hidden="true" className={cn("glass-card p-4", className)}>
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
    <div aria-hidden="true" className={cn("glass-card overflow-hidden", className)}>
      <BrandedSkeleton className="aspect-video w-full" />
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

export { Skeleton, BrandedSkeleton, StatSkeleton, AlertSkeleton, CameraSkeleton };
