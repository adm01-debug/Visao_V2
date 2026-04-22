import { Skeleton } from '@/components/ui/skeleton';

export function SettingsSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Carregando configurações…"
      className="p-6 space-y-6 min-h-[calc(100vh-8rem)]"
    >
      <div className="space-y-2 min-h-[60px]">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex gap-2 border-b pb-2 min-h-[44px]">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-9 w-28" />)}
      </div>
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-6 rounded-lg border space-y-4 min-h-[280px]">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full max-w-md" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end min-h-[40px]">
        <Skeleton className="h-10 w-32" />
      </div>
      <span className="sr-only">Carregando configurações…</span>
    </div>
  );
}
