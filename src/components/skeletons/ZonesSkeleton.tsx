import { Skeleton, BrandedSkeleton } from '@/components/ui/skeleton';
export function ZonesSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label="Carregando zonas…" className="p-6 space-y-6">
      <div className="flex items-center justify-between"><div><Skeleton className="h-8 w-24 mb-2" /><Skeleton className="h-4 w-52" /></div><Skeleton className="h-10 w-36" /></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><BrandedSkeleton className="aspect-video rounded-lg" /><div className="flex gap-2 mt-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-10" />)}</div></div>
        <div className="space-y-4"><Skeleton className="h-6 w-32" />{[...Array(4)].map((_, i) => (<div key={i} className="p-4 rounded-lg border"><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded" /><div className="flex-1"><Skeleton className="h-4 w-24 mb-1" /><Skeleton className="h-3 w-16" /></div></div></div>))}</div>
      </div>
      <span className="sr-only">Carregando zonas…</span>
    </div>
  );
}
