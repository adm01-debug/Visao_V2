import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface TabsSkeletonProps {
  tabsCount?: number;
  className?: string;
}

/**
 * Reserva a altura de uma TabsList enquanto o conteúdo está em loading,
 * evitando CLS quando as tabs reais aparecem.
 */
export function TabsSkeleton({ tabsCount = 3, className }: TabsSkeletonProps) {
  return (
    <div
      className={cn(
        'inline-flex h-10 items-center justify-start gap-1 rounded-md bg-muted p-1',
        className,
      )}
      aria-hidden="true"
    >
      {Array.from({ length: tabsCount }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-24 rounded-sm" />
      ))}
    </div>
  );
}

export default TabsSkeleton;
