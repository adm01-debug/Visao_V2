/**
 * VISÃO - Sistema de Vigilância Inteligente
 * RecordingPlayer Component
 */

import { memo, useRef, useState, useCallback, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Maximize,
  Download,
  Camera,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface RecordingData {
  id: string;
  cameraId: string;
  cameraName: string;
  url: string;
  thumbnailUrl?: string;
  startTime: Date | string;
  endTime: Date | string;
  duration: number;
  hasAlert?: boolean;
}

interface RecordingPlayerProps {
  recording: RecordingData;
  onSnapshot?: (imageData: string) => void;
  onDownload?: () => void;
  className?: string;
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function RecordingPlayerComponent({
  recording,
  onSnapshot,
  onDownload,
  className
}: RecordingPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const startTime = recording.startTime instanceof Date 
    ? recording.startTime 
    : new Date(recording.startTime);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleError = () => setError('Erro ao carregar gravação');
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleError);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleVolumeChange = useCallback((value: number[]) => {
    if (!videoRef.current) return;
    const vol = value[0];
    setVolume(vol);
    videoRef.current.volume = vol / 100;
    setIsMuted(vol === 0);
  }, []);

  const handleSeek = useCallback((value: number[]) => {
    if (!videoRef.current) return;
    const time = (value[0] / 100) * duration;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  }, [duration]);

  const skipSeconds = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
  }, [duration]);

  const cyclePlaybackRate = useCallback(() => {
    if (!videoRef.current) return;
    const rates = [0.5, 1, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    videoRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  }, [playbackRate]);

  const handleSnapshot = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !onSnapshot) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      onSnapshot(imageData);
    }
  }, [onSnapshot]);

  const handleFullscreen = useCallback(() => {
    if (!videoRef.current) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="w-4 h-4" />
            {recording.cameraName}
            {recording.hasAlert && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                Alerta
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {format(startTime, "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Video */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            src={recording.url}
            poster={recording.thumbnailUrl}
            className="w-full h-full object-contain"
            playsInline
          />
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white">
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-destructive" />
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Click to play overlay */}
          {!isPlaying && !error && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/40"
            >
              <div className="p-4 rounded-full bg-primary/90 text-primary-foreground">
                <Play className="w-8 h-8" />
              </div>
            </button>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Progress */}
        <div className="space-y-2">
          <Slider
            value={[progress]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => skipSeconds(-10)}>
            <SkipBack className="w-4 h-4" />
          </Button>
          
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={togglePlay}>
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </Button>
          
          <Button variant="ghost" size="icon" onClick={() => skipSeconds(10)}>
            <SkipForward className="w-4 h-4" />
          </Button>

          <Button variant="ghost" size="icon" onClick={toggleMute}>
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>

          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            max={100}
            className="w-20"
          />

          <div className="flex-1" />

          <Button variant="ghost" size="sm" onClick={cyclePlaybackRate}>
            {playbackRate}x
          </Button>

          {onSnapshot && (
            <Button variant="ghost" size="icon" onClick={handleSnapshot}>
              <Camera className="w-4 h-4" />
            </Button>
          )}

          {onDownload && (
            <Button variant="ghost" size="icon" onClick={onDownload}>
              <Download className="w-4 h-4" />
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={handleFullscreen}>
            <Maximize className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export const RecordingPlayer = memo(RecordingPlayerComponent);
