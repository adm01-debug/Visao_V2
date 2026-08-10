import { Skeleton } from '@/components/ui/skeleton';

export function SecuritySkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Carregando segurança…"
      className="p-6 space-y-6 min-h-[calc(100vh-8rem)]"
    >
      <div className="flex items-center justify-between min-h-[64px]">
        <div className="space-y-2">
          <Skeleton className="h-8 w-28" />
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
      <div className="flex gap-2 border-b pb-2 min-h-[44px]">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-32" />
        ))}
      </div>
      <div className="rounded-lg border">
        <div className="p-4 border-b bg-muted/50 min-h-[56px]">
          <div className="flex gap-4">
            <Skeleton className="h-4 w-24 shrink-0" />
            <Skeleton className="h-4 w-32 shrink-0" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-28 shrink-0" />
          </div>
        </div>
        {[...Array(10)].map((_, i) => (
          <div key={i} className="p-4 border-b last:border-0 min-h-[56px] flex items-center">
            <div className="flex gap-4 items-center w-full">
              <Skeleton className="h-6 w-16 shrink-0" />
              <Skeleton className="h-4 w-24 shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-32 shrink-0" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Carregando segurança…</span>
    </div>
  );
}
