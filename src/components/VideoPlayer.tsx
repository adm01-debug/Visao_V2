import { useInterval, useTimeout } from "@/hooks";
import { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  SkipBack, 
  SkipForward,
  Download,
  Camera as CameraIcon,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

interface TimelineEvent {
  id: string;
  timestamp: number; // percentage 0-100
  type: 'alert' | 'motion' | 'person';
  label: string;
}

interface VideoPlayerProps {
  cameraName: string;
  cameraLocation: string;
  isLive?: boolean;
  events?: TimelineEvent[];
}

const mockEvents: TimelineEvent[] = [
  { id: '1', timestamp: 15, type: 'person', label: '3 pessoas detectadas' },
  { id: '2', timestamp: 35, type: 'alert', label: 'Colaborador sem EPI' },
  { id: '3', timestamp: 52, type: 'motion', label: 'Movimento detectado' },
  { id: '4', timestamp: 78, type: 'alert', label: 'Aglomeração detectada' },
];

export function VideoPlayer({ 
  cameraName, 
  cameraLocation, 
  isLive = true,
  events = mockEvents 
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(isLive);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('00:00:00');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying && !isLive) {
      intervalRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.1;
        });
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, isLive]);

  useEffect(() => {
    if (isLive) {
      const updateTime = () => {
        const now = new Date();
        setCurrentTime(now.toLocaleTimeString('pt-BR'));
      };
      updateTime();
      const timer = setInterval(updateTime, 1000);
      return () => clearInterval(timer);
    } else {
      const totalSeconds = Math.floor((progress / 100) * 3600);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setCurrentTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }
  }, [isLive, progress]);

  const handleProgressChange = (value: number[]) => {
    setProgress(value[0]);
  };

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'alert': return 'bg-destructive';
      case 'motion': return 'bg-warning';
      case 'person': return 'bg-primary';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Video Container */}
      <div className="relative aspect-video bg-secondary rounded-xl overflow-hidden group">
        {/* Simulated video feed */}
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-background to-secondary flex items-center justify-center">
          <CameraIcon className="w-24 h-24 text-muted-foreground/20" />
        </div>

        {/* Scan line effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="scan-line opacity-20" />
        </div>

        {/* AI Detection Overlay - Simulated bounding boxes */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Person detection box 1 */}
          <div className="absolute top-[20%] left-[15%] w-[12%] h-[35%] border-2 border-primary rounded-sm">
            <div className="absolute -top-6 left-0 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
              Pessoa #1
            </div>
          </div>
          {/* Person detection box 2 */}
          <div className="absolute top-[25%] left-[40%] w-[10%] h-[30%] border-2 border-primary rounded-sm">
            <div className="absolute -top-6 left-0 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
              Pessoa #2
            </div>
          </div>
          {/* Alert zone */}
          <div className="absolute top-[30%] right-[10%] w-[20%] h-[40%] border-2 border-destructive border-dashed rounded-sm animate-pulse">
            <div className="absolute -top-6 right-0 bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Zona de Alerta
            </div>
          </div>
        </div>

        {/* Top overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-background/80 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">{cameraName}</h3>
              <p className="text-sm text-muted-foreground">{cameraLocation}</p>
            </div>
            <div className="flex items-center gap-2">
              {isLive && (
                <Badge variant="destructive" className="gap-1">
                  <span className="w-1.5 h-1.5 bg-destructive-foreground rounded-full animate-pulse" />
                  AO VIVO
                </Badge>
              )}
              <span className="font-mono text-sm text-foreground bg-background/50 px-2 py-1 rounded">
                {currentTime}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <SkipBack className="w-4 h-4 text-foreground" />
            </button>

            <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <SkipForward className="w-4 h-4 text-foreground" />
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-foreground" />
              ) : (
                <Volume2 className="w-4 h-4 text-foreground" />
              )}
            </button>

            <div className="flex-1" />

            <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <Download className="w-4 h-4 text-foreground" />
            </button>

            <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <Maximize className="w-4 h-4 text-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline with events */}
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Timeline</span>
          <span className="font-mono text-muted-foreground">
            {isLive ? 'Ao vivo' : `${Math.floor(progress)}% • 01:00:00`}
          </span>
        </div>

        {/* Progress bar with events */}
        <div className="relative">
          {/* Event markers */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-4 pointer-events-none z-10">
            {events.map((event) => (
              <div
                key={event.id}
                className={cn(
                  "absolute w-2 h-2 rounded-full -translate-x-1/2 cursor-pointer transition-transform hover:scale-150",
                  getEventColor(event.type)
                )}
                style={{ left: `${event.timestamp}%` }}
                title={event.label}
              />
            ))}
          </div>

          <Slider
            value={[progress]}
            onValueChange={handleProgressChange}
            max={100}
            step={0.1}
            className="cursor-pointer"
            disabled={isLive}
          />
        </div>

        {/* Event legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-destructive" />
            <span>Alertas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warning" />
            <span>Movimento</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>Pessoas</span>
          </div>
        </div>
      </div>
    </div>
  );
}
