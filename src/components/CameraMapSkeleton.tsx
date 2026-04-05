import { MapPin } from 'lucide-react';
import { Skeleton, BrandedSkeleton } from '@/components/ui/skeleton';

export function CameraMapSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`relative rounded-lg overflow-hidden bg-muted/30 ${className}`}>
      <Skeleton className="w-full h-full min-h-[300px]" />

      {/* Simulated legend skeleton */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <Skeleton className="h-3 w-16 mb-2" />
        <div className="space-y-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="w-3 h-3 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Simulated camera count skeleton */}
      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground animate-pulse" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}
