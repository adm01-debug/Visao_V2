import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface FiltersBarSkeletonProps {
  searchWidth?: string;
  selectsCount?: number;
  showViewSwitcher?: boolean;
  showResetButton?: boolean;
  className?: string;
}

/**
 * Reserva espaço de uma barra de filtros (search + selects + view switcher)
 * para evitar CLS durante o loading.
 */
export function FiltersBarSkeleton({
  searchWidth = 'max-w-md',
  selectsCount = 2,
  showViewSwitcher = true,
  showResetButton = false,
  className,
}: FiltersBarSkeletonProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-start sm:items-center gap-4',
        className,
      )}
      aria-hidden="true"
    >
      <Skeleton className={cn('h-10 w-full', searchWidth, 'flex-1')} />
      <div className="flex items-center gap-2">
        {Array.from({ length: selectsCount }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-32" />
        ))}
        {showResetButton && <Skeleton className="h-10 w-20" />}
      </div>
      {showViewSwitcher && (
        <div className="flex items-center gap-1 border border-border/50 rounded-lg p-1 ml-auto">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      )}
    </div>
  );
}

export default FiltersBarSkeleton;
