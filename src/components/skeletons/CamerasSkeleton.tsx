import { Skeleton, BrandedSkeleton } from '@/components/ui/skeleton';
import { FiltersBarSkeleton } from './FiltersBarSkeleton';

export function CamerasSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Carregando câmeras…"
      className="p-6 space-y-6 min-h-[calc(100vh-8rem)]"
    >
      <div className="flex items-center justify-between min-h-[64px]">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
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
          <div key={i} className="rounded-lg overflow-hidden border flex flex-col">
            <BrandedSkeleton aspectRatio="16 / 9" className="w-full" />
            <div className="p-3 space-y-2 min-h-[64px]">
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
