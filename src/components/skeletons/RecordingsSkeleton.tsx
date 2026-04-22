import { Skeleton, BrandedSkeleton } from '@/components/ui/skeleton';

export function RecordingsSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Carregando gravações…"
      className="p-6 space-y-6 min-h-[calc(100vh-8rem)]"
    >
      <div className="flex items-center justify-between min-h-[64px]">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-44" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg border min-h-[96px] flex flex-col justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="flex gap-4 flex-wrap min-h-[40px]">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="rounded-lg overflow-hidden border flex flex-col">
            <BrandedSkeleton aspectRatio="16 / 9" className="w-full" />
            <div className="p-3 space-y-2 min-h-[64px]">
              <Skeleton className="h-4 w-3/4" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Carregando gravações…</span>
    </div>
  );
}
