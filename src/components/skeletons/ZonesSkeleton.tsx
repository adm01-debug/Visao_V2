import { Skeleton, BrandedSkeleton } from '@/components/ui/skeleton';

export function ZonesSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Carregando zonas…"
      className="p-6 space-y-6 min-h-[calc(100vh-8rem)]"
    >
      <div className="flex items-center justify-between min-h-[64px]">
        <div className="space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <BrandedSkeleton aspectRatio="16 / 9" className="w-full rounded-lg" />
          <div className="flex gap-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-10" />)}
          </div>
        </div>
        <div className="space-y-4 min-h-[400px]">
          <Skeleton className="h-6 w-32" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 rounded-lg border min-h-[72px] flex items-center">
              <div className="flex items-center gap-3 w-full">
                <Skeleton className="h-8 w-8 rounded shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Carregando zonas…</span>
    </div>
  );
}
