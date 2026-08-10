import { memo } from 'react';
import { Camera, Users, Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Database } from '@/integrations/supabase/types';

type CameraStatus = Database['public']['Enums']['camera_status'];
import { VideoStreamPlayer } from '@/components/VideoStreamPlayer';
import { ZoneOverlay } from '@/components/ZoneOverlay';
import { useZoneDetection } from '@/hooks/useZoneDetection';
import { cn } from '@/lib/utils';
import type { DashboardSettings } from './DashboardTypes';
import type { DbRule } from '@/types/rules';

export interface UICameraData {
  id: string;
  name: string;
  location: string;
  status: CameraStatus;
  thumbnail?: string;
  lastActivity?: string;
  detectedPeople: number;
  alerts: number;
  latitude: number | null;
  longitude: number | null;
  streamUrl?: string;
  streamProtocol: string;
}

interface CameraStreamCardProps {
  camera: UICameraData;
  isSelected: boolean;
  onClick: () => void;
  settings: DashboardSettings;
  compact?: boolean;
  /** Rules to pass to continuous analysis engine */
  analysisRules?: DbRule[];
}

function CameraStreamCardBase({
  camera,
  isSelected,
  onClick,
  settings,
  compact = false,
  analysisRules,
}: CameraStreamCardProps) {
  const hasStream = camera.streamUrl && settings.enableStreaming;
  const hasAlerts = camera.alerts > 0;
  const isOnline = camera.status === 'online' || camera.status === 'alert';

  const { zones } = useZoneDetection({ cameraId: camera.id, cameraName: camera.name });

  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 border bg-card hover:shadow-lg',
        isSelected && 'ring-2 ring-primary',
        hasAlerts && 'border-destructive/50',
        compact ? 'h-24' : 'aspect-video'
      )}
      onClick={onClick}
    >
      {hasStream && isOnline ? (
        <div className="absolute inset-0">
          <VideoStreamPlayer
            cameraId={camera.id}
            streamUrl={camera.streamUrl!}
            protocol={camera.streamProtocol as 'hls' | 'webrtc' | 'rtsp'}
            cameraName={camera.name}
            enableContinuousAnalysis={settings.enableAnalysis}
            analysisRules={analysisRules}
            saveAnalysisHistory
          />
          {settings.enableZones && zones.length > 0 && (
            <ZoneOverlay zones={zones} showStats={false} showLabels />
          )}
        </div>
      ) : (
        <div className="absolute inset-0">
          {camera.thumbnail ? (
            <img
              src={camera.thumbnail}
              alt={camera.name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Camera className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      <div className="absolute top-2 left-2 flex items-center gap-2">
        <Badge
          variant={isOnline ? 'default' : 'destructive'}
          className={cn('text-[10px] px-1.5 py-0.5 gap-1', isOnline && 'bg-success')}
        >
          {isOnline ? (
            <>
              <span
                className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"
                aria-hidden="true"
              />
              AO VIVO
            </>
          ) : (
            <>
              <Camera className="w-2.5 h-2.5" aria-hidden="true" />
              OFFLINE
            </>
          )}
        </Badge>
        {hasStream && isOnline && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            REC
          </Badge>
        )}
        {settings.enableAnalysis && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-background/50">
            <Brain className="w-2.5 h-2.5 mr-0.5" />
            IA
          </Badge>
        )}
      </div>

      {hasAlerts && (
        <div className="absolute top-2 right-2">
          <Badge variant="destructive" className="text-[10px] animate-pulse">
            {camera.alerts} alertas
          </Badge>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-foreground text-sm truncate">{camera.name}</h3>
            <p className="text-[10px] text-foreground/70 truncate">{camera.location}</p>
          </div>
          <div className="flex items-center gap-1 text-foreground/80">
            <Users className="w-3 h-3" />
            <span className="text-xs">{camera.detectedPeople}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const CameraStreamCard = memo(CameraStreamCardBase);
