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
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Carregando filtros…"
      className={cn(
        'flex flex-col sm:flex-row items-start sm:items-center gap-4',
        // Reserva fixa: 1 linha (40px) em sm+ ou 2 linhas (~96px) em mobile
        'min-h-[96px] sm:min-h-[40px]',
        className
      )}
    >
      <Skeleton className={cn('h-10 w-full flex-1', searchWidth)} />
      <div className="flex items-center gap-2 shrink-0">
        {Array.from({ length: selectsCount }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-32" />
        ))}
        {showResetButton && <Skeleton className="h-10 w-20" />}
      </div>
      {showViewSwitcher && (
        <div className="flex items-center gap-1 border border-border/50 rounded-lg p-1 ml-auto shrink-0 h-10">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      )}
      <span className="sr-only">Carregando filtros…</span>
    </div>
  );
}

export default FiltersBarSkeleton;
