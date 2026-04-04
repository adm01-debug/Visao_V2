import { Skeleton } from '@/components/ui/skeleton';
export function CamerasSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between"><div><Skeleton className="h-8 w-32 mb-2" /><Skeleton className="h-4 w-48" /></div><div className="flex gap-2"><Skeleton className="h-10 w-32" /><Skeleton className="h-10 w-10" /></div></div>
      <div className="flex gap-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-10 w-32" /><Skeleton className="h-10 w-32" /></div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (<div key={i} className="rounded-lg overflow-hidden border"><Skeleton className="aspect-video" /><div className="p-3 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>))}
      </div>
    </div>
  );
}
