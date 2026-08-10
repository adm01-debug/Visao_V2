/**
 * VISÃO - Camera Feed Card
 */
import { memo, useEffect, useRef } from 'react';
import { Camera, Maximize2, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RecognitionResult } from '@/hooks/useMultiCameraRecognition';

interface CameraFeedCardProps {
  camera: { id: string; name: string; stream_url?: string | null; thumbnail?: string | null };
  isAnalyzing: boolean;
  onVideoLoaded: (video: HTMLVideoElement) => void;
  onRemove: () => void;
  onFullscreen: () => void;
  recentDetections: RecognitionResult[];
}

function CameraFeedCardComponent({
  camera,
  isAnalyzing,
  onVideoLoaded,
  onRemove,
  onFullscreen,
  recentDetections,
}: CameraFeedCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) onVideoLoaded(videoRef.current);
  }, [onVideoLoaded]);
  const latest = recentDetections[0];

  return (
    <Card className="overflow-hidden flex flex-col">
      <CardHeader className="p-3 flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              isAnalyzing ? 'bg-success animate-pulse' : 'bg-muted-foreground'
            )}
          />
          <CardTitle className="text-sm font-medium truncate">{camera.name}</CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onFullscreen}
            aria-label="Tela cheia"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onRemove}
            aria-label="Remover"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 relative">
        <div className="aspect-video bg-foreground">
          {camera.stream_url ? (
            <video
              ref={videoRef}
              src={camera.stream_url}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          ) : camera.thumbnail ? (
            <img
              src={camera.thumbnail}
              alt={camera.name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="h-8 w-8 text-muted-foreground/50" />
            </div>
          )}
        </div>
        {latest && (
          <div
            className={cn(
              'absolute bottom-0 left-0 right-0 p-2',
              latest.isBlacklist ? 'bg-destructive/90' : 'bg-background/90'
            )}
          >
            <div className="flex items-center gap-2">
              {latest.isBlacklist ? (
                <AlertTriangle className="h-4 w-4 text-destructive-foreground" />
              ) : (
                <CheckCircle className="h-4 w-4 text-success" />
              )}
              <span
                className={cn(
                  'text-sm font-medium truncate',
                  latest.isBlacklist && 'text-destructive-foreground'
                )}
              >
                {latest.personName}
              </span>
              {latest.confidence > 0 && (
                <Badge variant="secondary" className="text-xs ml-auto">
                  {(latest.confidence * 100).toFixed(0)}%
                </Badge>
              )}
            </div>
          </div>
        )}
        {isAnalyzing && (
          <div className="absolute top-2 right-2">
            <div className="flex items-center gap-1.5 bg-primary/90 text-primary-foreground px-2 py-1 rounded-full text-xs">
              <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
              Analisando
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const CameraFeedCard = memo(CameraFeedCardComponent);
