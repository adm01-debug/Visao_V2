import React from 'react';
import { MapPin, Camera } from 'lucide-react';
import { useCameras } from '@/hooks/useCameras';
import { cn } from '@/lib/utils';

export function CameraMapWidget() {
  const { cameras, loading } = useCameras();

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse bg-muted rounded w-full h-full" />
      </div>
    );
  }

  // Group cameras by location
  const locationGroups = React.useMemo(() => {
    const groups: Record<string, typeof cameras> = {};
    cameras?.forEach(camera => {
      const location = camera.location || 'Sem localização';
      if (!groups[location]) {
        groups[location] = [];
      }
      groups[location]!.push(camera);
    });
    return groups;
  }, [cameras]);

  const locations = Object.entries(locationGroups);

  return (
    <div className="h-full">
      {/* Placeholder map visualization */}
      <div className="relative h-full bg-muted/30 rounded-lg overflow-hidden">
        {/* Grid background */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Location markers */}
        <div className="absolute inset-4 flex flex-wrap gap-2 content-start">
          {locations.map(([location, cams], index) => {
            const onlineCount = cams?.filter(c => c.status === 'online' || c.status === 'alert').length || 0;
            const totalCount = cams?.length || 0;
            const hasAlert = cams?.some(c => c.status === 'alert');

            return (
              <div
                key={location}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
                  'bg-card border shadow-sm cursor-pointer hover:border-primary',
                  hasAlert && 'border-destructive animate-pulse',
                )}
              >
                <MapPin className={cn(
                  'h-3 w-3',
                  hasAlert ? 'text-destructive' : 
                  onlineCount === totalCount ? 'text-success' : 'text-warning'
                )} />
                <span className="max-w-[80px] truncate">{location}</span>
                <span className="text-muted-foreground">
                  {onlineCount}/{totalCount}
                </span>
              </div>
            );
          })}
        </div>

        {locations.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <MapPin className="h-8 w-8 mb-2 opacity-50" />
            <span className="text-sm">Nenhuma câmera com localização</span>
          </div>
        )}
      </div>
    </div>
  );
}
