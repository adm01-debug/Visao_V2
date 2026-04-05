import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Maximize2, AlertTriangle, Camera as CameraIcon } from 'lucide-react';
import { VideoStreamPlayer } from '../VideoStreamPlayer';
import { DbCamera } from '@/hooks/useCameras';

interface CameraTileProps {
  camera: DbCamera;
  isSelected: boolean;
  showStream: boolean;
  onSelect: () => void;
  onExpand: () => void;
  compact?: boolean;
}

export function CameraTile({ camera, isSelected, showStream, onSelect, onExpand, compact }: CameraTileProps) {
  const hasAlerts = (camera.alerts_count || 0) > 0;
  const isOnline = camera.status === 'online' || camera.status === 'alert';

  if (compact) {
    return (
      <div className={cn('glass-card p-3 cursor-pointer transition-all hover:border-primary/50 flex items-center gap-4', isSelected && 'border-primary', hasAlerts && 'border-destructive/50')} onClick={onSelect}>
        <div className="relative w-32 h-20 bg-secondary rounded-lg overflow-hidden flex-shrink-0">
          {showStream && isOnline ? <VideoStreamPlayer cameraId={camera.id} cameraName={camera.name} height="100%" /> : (
            <div className="absolute inset-0 flex items-center justify-center"><CameraIcon className="w-8 h-8 text-muted-foreground/30" /></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{camera.name}</h3>
          <p className="text-sm text-muted-foreground truncate">{camera.location}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={isOnline ? 'default' : 'secondary'} className={cn('text-xs', camera.status === 'alert' && 'bg-destructive')}>{isOnline ? 'Online' : 'Offline'}</Badge>
            {hasAlerts && <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />{camera.alerts_count}</Badge>}
          </div>
        </div>
        <Button variant="ghost" size="sm" className="flex-shrink-0" onClick={(e) => { e.stopPropagation(); onExpand(); }}><Maximize2 className="w-4 h-4" /></Button>
      </div>
    );
  }

  return (
    <div className={cn('relative rounded-xl overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 group', isSelected && 'ring-2 ring-primary', hasAlerts && 'ring-2 ring-destructive/50')} onClick={onSelect}>
      {showStream && isOnline ? <VideoStreamPlayer cameraId={camera.id} cameraName={camera.name} location={camera.location} /> : (
        <div className="aspect-video bg-secondary flex items-center justify-center">
          <div className="text-center"><CameraIcon className="w-12 h-12 mx-auto mb-2 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">{camera.name}</p><p className="text-xs text-muted-foreground/70">{camera.location}</p></div>
        </div>
      )}
      <Button variant="secondary" size="sm" className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); onExpand(); }}><Maximize2 className="w-4 h-4" /></Button>
      {hasAlerts && <Badge variant="destructive" className="absolute top-2 left-2 gap-1"><AlertTriangle className="w-3 h-3" />{camera.alerts_count}</Badge>}
    </div>
  );
}
