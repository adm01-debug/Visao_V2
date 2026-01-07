import React from 'react';
import { Camera, Circle } from 'lucide-react';
import { useCameras } from '@/hooks/useCameras';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export function CamerasGridWidget() {
  const { cameras, loading } = useCameras();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2 h-full">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse bg-muted rounded-lg aspect-video" />
        ))}
      </div>
    );
  }

  const displayCameras = cameras?.slice(0, 4) || [];

  return (
    <div className="grid grid-cols-2 gap-2 h-full">
      {displayCameras.map((camera) => {
        const isOnline = camera.status === 'online' || camera.status === 'alert';
        const hasAlert = camera.status === 'alert';
        
        return (
          <div
            key={camera.id}
            className={cn(
              'relative rounded-lg overflow-hidden cursor-pointer',
              'border hover:border-primary transition-colors',
              hasAlert && 'border-destructive animate-pulse',
            )}
            onClick={() => navigate(`/cameras/${camera.id}`)}
          >
            {/* Thumbnail or placeholder */}
            {camera.thumbnail ? (
              <img
                src={camera.thumbnail}
                alt={camera.name}
                className="w-full h-full object-cover aspect-video"
              />
            ) : (
              <div className="w-full aspect-video bg-muted flex items-center justify-center">
                <Camera className="h-6 w-6 text-muted-foreground" />
              </div>
            )}

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

            {/* Status indicator */}
            <div className="absolute top-1 left-1">
              <Badge
                variant={isOnline ? 'default' : 'destructive'}
                className={cn(
                  'text-[9px] px-1 py-0 gap-1',
                  isOnline && 'bg-success hover:bg-success',
                )}
              >
                <Circle className={cn('h-1.5 w-1.5', isOnline && 'animate-pulse')} fill="currentColor" />
                {isOnline ? 'LIVE' : 'OFF'}
              </Badge>
            </div>

            {/* Camera name */}
            <div className="absolute bottom-0 left-0 right-0 p-1.5">
              <p className="text-[10px] text-white font-medium truncate">{camera.name}</p>
              <p className="text-[8px] text-white/70 truncate">{camera.location}</p>
            </div>
          </div>
        );
      })}

      {displayCameras.length === 0 && (
        <div className="col-span-2 flex items-center justify-center text-muted-foreground text-sm">
          Nenhuma câmera cadastrada
        </div>
      )}
    </div>
  );
}
