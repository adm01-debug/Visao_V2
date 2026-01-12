import React from 'react';
import { cn } from '@/lib/utils';

interface Segment {
  start: number;
  end: number;
  type: 'recording' | 'motion' | 'alert';
}

interface PlaybackTimelineProps {
  duration: number;
  currentTime: number;
  segments: Segment[];
  onSeek: (time: number) => void;
  className?: string;
}

const typeColors = { recording: 'bg-blue-500', motion: 'bg-yellow-500', alert: 'bg-red-500' };

export function PlaybackTimeline({ duration, currentTime, segments, onSeek, className }: PlaybackTimelineProps) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    onSeek(percent * duration);
  };

  return (
    <div className={cn('relative h-8 bg-muted rounded cursor-pointer', className)} onClick={handleClick}>
      {segments.map((seg, i) => (
        <div key={i} className={cn('absolute h-full opacity-70', typeColors[seg.type])}
          style={{ left: `${(seg.start / duration) * 100}%`, width: `${((seg.end - seg.start) / duration) * 100}%` }} />
      ))}
      <div className="absolute top-0 w-0.5 h-full bg-primary z-10" style={{ left: `${(currentTime / duration) * 100}%` }} />
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground px-1">
        <span>00:00</span>
        <span>{Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}</span>
      </div>
    </div>
  );
}

export default PlaybackTimeline;
