import { Shimmer } from '@/components/ui/LoadingState';
import { Shield } from 'lucide-react';
import { BrandedSkeleton } from '@/components/ui/skeleton';

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-in">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="glass-card p-5" style={{ animationDelay: `${i * 60}ms` }}>
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              <Shimmer className="h-4 w-24" />
              <Shimmer className="h-8 w-16" />
              <Shimmer className="h-3 w-20" />
            </div>
            <Shimmer className="h-12 w-12 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CameraGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card overflow-hidden" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="aspect-video w-full relative">
            <BrandedSkeleton className="absolute inset-0" />
          </div>
          <div className="p-3 space-y-2">
            <Shimmer className="h-4 w-3/4" />
            <Shimmer className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AlertsSidebarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Shimmer className="h-6 w-32" />
        <Shimmer className="h-6 w-16 rounded-full" />
      </div>
      <Shimmer className="h-9 w-full rounded-md" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card" style={{ animationDelay: `${i * 60}ms` }}>
          <Shimmer className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-4 w-3/4" />
            <Shimmer className="h-3 w-full" />
            <Shimmer className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <StatsSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Shimmer className="h-8 w-48" />
          <CameraGridSkeleton />
        </div>
        <AlertsSidebarSkeleton />
      </div>
    </div>
  );
}
