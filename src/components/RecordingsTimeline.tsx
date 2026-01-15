/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: RecordingsTimeline - Timeline visual de gravações
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Play, Pause, SkipBack, SkipForward, ZoomIn, ZoomOut,
  Calendar, Clock, AlertTriangle, Video
} from 'lucide-react';
import { format, addHours, startOfDay, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Recording {
  id: string;
  camera_id: string;
  camera_name: string;
  start_time: string;
  end_time: string;
  duration: number;
  has_alerts: boolean;
  file_url?: string;
}

interface TimelineEvent {
  id: string;
  type: 'alert' | 'motion' | 'face' | 'plate';
  timestamp: string;
  description: string;
}

interface RecordingsTimelineProps {
  recordings: Recording[];
  events?: TimelineEvent[];
  selectedDate: Date;
  onSelectRecording?: (recording: Recording) => void;
  onTimeChange?: (time: Date) => void;
}

export function RecordingsTimeline({
  recordings,
  events = [],
  selectedDate,
  onSelectRecording,
  onTimeChange,
}: RecordingsTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoveredRecording, setHoveredRecording] = useState<Recording | null>(null);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const pixelsPerHour = 100 * zoom;
  const totalWidth = 24 * pixelsPerHour;

  // Calculate position for a given time
  const getPositionForTime = useCallback((time: Date | string) => {
    const date = typeof time === 'string' ? new Date(time) : time;
    const dayStart = startOfDay(selectedDate);
    const minutes = differenceInMinutes(date, dayStart);
    return (minutes / 60) * pixelsPerHour;
  }, [selectedDate, pixelsPerHour]);

  // Calculate width for recording duration
  const getWidthForDuration = useCallback((startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const minutes = differenceInMinutes(end, start);
    return Math.max((minutes / 60) * pixelsPerHour, 10);
  }, [pixelsPerHour]);

  // Auto-scroll to current time
  useEffect(() => {
    if (timelineRef.current) {
      const position = getPositionForTime(currentTime);
      timelineRef.current.scrollLeft = position - timelineRef.current.clientWidth / 2;
    }
  }, [currentTime, getPositionForTime]);

  // Playback simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const next = new Date(prev.getTime() + 60000); // 1 minute per tick
          onTimeChange?.(next);
          return next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, onTimeChange]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.5, 0.5));

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft;
    const hours = x / pixelsPerHour;
    const newTime = addHours(startOfDay(selectedDate), hours);
    setCurrentTime(newTime);
    onTimeChange?.(newTime);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Timeline de Gravações
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {format(currentTime, "HH:mm:ss", { locale: ptBR })}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentTime(prev => new Date(prev.getTime() - 3600000))}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentTime(prev => new Date(prev.getTime() + 3600000))}>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Timeline */}
        <div 
          ref={timelineRef}
          className="relative overflow-x-auto border rounded-lg bg-muted/20"
          style={{ height: '200px' }}
          onClick={handleTimelineClick}
        >
          <div className="relative" style={{ width: totalWidth, height: '100%' }}>
            {/* Hour markers */}
            <div className="absolute top-0 left-0 right-0 h-8 border-b bg-background/80 flex">
              {hours.map(hour => (
                <div
                  key={hour}
                  className="flex-shrink-0 border-r text-xs text-muted-foreground px-1 py-1"
                  style={{ width: pixelsPerHour }}
                >
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Recordings */}
            <div className="absolute top-10 left-0 right-0 bottom-0">
              {recordings.map(recording => {
                const left = getPositionForTime(recording.start_time);
                const width = getWidthForDuration(recording.start_time, recording.end_time);
                
                return (
                  <div
                    key={recording.id}
                    className={`absolute h-12 rounded cursor-pointer transition-all ${
                      recording.has_alerts 
                        ? 'bg-red-500/70 hover:bg-red-500' 
                        : 'bg-primary/70 hover:bg-primary'
                    }`}
                    style={{ left, width, top: '10px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRecording?.(recording);
                    }}
                    onMouseEnter={() => setHoveredRecording(recording)}
                    onMouseLeave={() => setHoveredRecording(null)}
                  >
                    <div className="px-2 py-1 text-xs text-white truncate">
                      {recording.camera_name}
                    </div>
                    {recording.has_alerts && (
                      <AlertTriangle className="absolute top-1 right-1 h-3 w-3 text-white" />
                    )}
                  </div>
                );
              })}

              {/* Events markers */}
              {events.map(event => {
                const left = getPositionForTime(event.timestamp);
                return (
                  <div
                    key={event.id}
                    className="absolute w-1 h-full bg-yellow-500"
                    style={{ left }}
                    title={event.description}
                  />
                );
              })}
            </div>

            {/* Current time indicator */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
              style={{ left: getPositionForTime(currentTime) }}
            >
              <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full" />
            </div>
          </div>
        </div>

        {/* Tooltip */}
        {hoveredRecording && (
          <div className="absolute bg-popover border rounded-lg p-3 shadow-lg z-20">
            <p className="font-medium">{hoveredRecording.camera_name}</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(hoveredRecording.start_time), "HH:mm", { locale: ptBR })} - 
              {format(new Date(hoveredRecording.end_time), "HH:mm", { locale: ptBR })}
            </p>
            <p className="text-sm">Duração: {hoveredRecording.duration} min</p>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary" />
            <span>Gravação normal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span>Com alertas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-yellow-500" />
            <span>Evento</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
