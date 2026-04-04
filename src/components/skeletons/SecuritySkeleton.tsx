import { Skeleton } from '@/components/ui/skeleton';
export function SecuritySkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between"><div><Skeleton className="h-8 w-28 mb-2" /><Skeleton className="h-4 w-44" /></div><div className="flex gap-2"><Skeleton className="h-10 w-28" /><Skeleton className="h-10 w-28" /></div></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => (<div key={i} className="p-4 rounded-lg border"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-8 w-16" /></div>))}</div>
      <div className="flex gap-2 border-b pb-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-9 w-32" />)}</div>
      <div className="rounded-lg border">
        <div className="p-4 border-b bg-muted/50"><div className="flex gap-4"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-32" /><Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-28" /></div></div>
        {[...Array(10)].map((_, i) => (<div key={i} className="p-4 border-b last:border-0"><div className="flex gap-4 items-center"><Skeleton className="h-6 w-16" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-32" /></div></div>))}
      </div>
    </div>
  );
}
