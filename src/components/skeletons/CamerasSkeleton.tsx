import { Skeleton, BrandedSkeleton } from '@/components/ui/skeleton';
import { FiltersBarSkeleton } from './FiltersBarSkeleton';

export function CamerasSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label="Carregando câmeras…" className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
      <FiltersBarSkeleton selectsCount={1} showViewSwitcher />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="rounded-lg overflow-hidden border">
            <BrandedSkeleton className="aspect-video" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Carregando câmeras…</span>
    </div>
  );
}
