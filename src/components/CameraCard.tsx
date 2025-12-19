import { Camera } from '@/types/surveillance';
import { StatusIndicator } from './StatusIndicator';
import { Badge } from '@/components/ui/badge';
import { Users, AlertTriangle, MapPin, Video, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HighlightText } from './HighlightText';

export interface CameraCardProps {
  camera: Camera;
  onClick?: () => void;
  compact?: boolean;
  searchQuery?: string;
}

export function CameraCard({ camera, onClick, compact = false, searchQuery = '' }: CameraCardProps) {
  const hasAlerts = camera.alerts && camera.alerts > 0;
  
  if (compact) {
    return (
      <div 
        className={cn(
          "glass-card p-3 cursor-pointer transition-all duration-300 hover:border-primary/50 group flex items-center gap-4",
          hasAlerts && "border-destructive/50"
        )}
        onClick={onClick}
      >
        <div className="relative w-20 h-14 bg-secondary rounded-lg overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary to-background flex items-center justify-center">
            <Video className="w-6 h-6 text-muted-foreground/30" />
          </div>
          <div className="absolute top-1 left-1">
            <StatusIndicator status={camera.status} size="sm" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            <HighlightText text={camera.name} highlight={searchQuery} />
          </h3>
          <div className="flex items-center gap-3 mt-0.5 text-muted-foreground text-sm">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <HighlightText text={camera.location} highlight={searchQuery} />
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {camera.detectedPeople || 0}
            </span>
          </div>
        </div>
        
        {hasAlerts && (
          <Badge variant="alert" className="gap-1 flex-shrink-0">
            <AlertTriangle className="w-3 h-3" />
            {camera.alerts}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "glass-card overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-primary/50 group",
        hasAlerts && "border-destructive/50 alert-glow"
      )}
      onClick={onClick}
    >
      {/* Camera Preview */}
      <div className="relative aspect-video bg-secondary overflow-hidden">
        {/* Simulated camera feed */}
        <div className="absolute inset-0 bg-gradient-to-br from-secondary to-background flex items-center justify-center">
          <Video className="w-12 h-12 text-muted-foreground/30" />
        </div>
        
        {/* Scan line effect */}
        <div className="scan-line opacity-30" />

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/30">
          <div className="p-4 rounded-full bg-primary/90 text-primary-foreground transform group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6" />
          </div>
        </div>
        
        {/* Status overlay */}
        <div className="absolute top-3 left-3">
          <StatusIndicator status={camera.status} size="sm" />
        </div>
        
        {/* Alerts badge */}
        {hasAlerts && (
          <div className="absolute top-3 right-3">
            <Badge variant="alert" className="gap-1">
              <AlertTriangle className="w-3 h-3" />
              {camera.alerts}
            </Badge>
          </div>
        )}
        
        {/* People count */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1">
          <Users className="w-3 h-3 text-primary" />
          <span className="text-xs font-medium">{camera.detectedPeople || 0}</span>
        </div>
        
        {/* Live indicator */}
        {camera.status === 'online' && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-destructive/90 backdrop-blur-sm rounded-full px-2 py-1">
            <span className="w-1.5 h-1.5 bg-destructive-foreground rounded-full animate-pulse" />
            <span className="text-xs font-medium text-destructive-foreground">LIVE</span>
          </div>
        )}
      </div>
      
      {/* Camera Info */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
          <HighlightText text={camera.name} highlight={searchQuery} />
        </h3>
        <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span className="text-sm">
            <HighlightText text={camera.location} highlight={searchQuery} />
          </span>
        </div>
      </div>
    </div>
  );
}
