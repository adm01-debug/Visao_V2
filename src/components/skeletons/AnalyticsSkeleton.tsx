import { Skeleton } from '@/components/ui/skeleton';

export function AnalyticsSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Carregando análises…"
      className="p-6 space-y-6 min-h-[calc(100vh-8rem)]"
    >
      <div className="flex items-center justify-between min-h-[64px]">
        <div className="space-y-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-6 rounded-lg border min-h-[140px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-lg border min-h-[280px]">
          <Skeleton className="h-5 w-36 mb-4" />
          <Skeleton className="h-[200px] w-full" />
        </div>
        <div className="p-6 rounded-lg border min-h-[280px] flex flex-col">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton aspectRatio="1 / 1" className="w-40 rounded-full mx-auto" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="p-6 rounded-lg border min-h-[260px]">
            <Skeleton className="h-5 w-40 mb-4" />
            <div className="space-y-3">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="flex items-center gap-3 min-h-[24px]">
                  <Skeleton className="h-4 w-4 shrink-0" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Carregando análises…</span>
    </div>
  );
}
