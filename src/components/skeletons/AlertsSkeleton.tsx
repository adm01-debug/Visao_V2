import { Skeleton } from '@/components/ui/skeleton';
export function AlertsSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between"><div><Skeleton className="h-8 w-24 mb-2" /><Skeleton className="h-4 w-40" /></div><Skeleton className="h-10 w-32" /></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => (<div key={i} className="p-4 rounded-lg border"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-8 w-12" /></div>))}</div>
      <div className="flex gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-28" />)}</div>
      <div className="rounded-lg border">
        <div className="p-4 border-b"><div className="flex gap-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-4 flex-1" />)}</div></div>
        {[...Array(8)].map((_, i) => (<div key={i} className="p-4 border-b last:border-0"><div className="flex gap-4 items-center"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div><Skeleton className="h-6 w-16" /></div></div>))}
      </div>
    </div>
  );
}
