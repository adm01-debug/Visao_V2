import { Skeleton } from '@/components/ui/skeleton';
export function PeopleSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between"><div><Skeleton className="h-8 w-36 mb-2" /><Skeleton className="h-4 w-56" /></div><Skeleton className="h-10 w-40" /></div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">{[...Array(5)].map((_, i) => (<div key={i} className="p-4 rounded-lg border text-center"><Skeleton className="h-10 w-10 rounded-full mx-auto mb-2" /><Skeleton className="h-6 w-8 mx-auto mb-1" /><Skeleton className="h-3 w-16 mx-auto" /></div>))}</div>
      <div className="flex gap-2 border-b pb-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-28" />)}</div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (<div key={i} className="rounded-lg border p-4 text-center"><Skeleton className="h-20 w-20 rounded-full mx-auto mb-3" /><Skeleton className="h-4 w-24 mx-auto mb-2" /><Skeleton className="h-3 w-16 mx-auto mb-3" /><Skeleton className="h-6 w-20 mx-auto" /></div>))}
      </div>
    </div>
  );
}
