import React from 'react';
import { cn } from '@/lib/utils';
import { Circle } from 'lucide-react';

interface RecordingBadgeProps {
  isRecording: boolean;
  duration?: string;
  className?: string;
}

export function RecordingBadge({ isRecording, duration, className }: RecordingBadgeProps) {
  if (!isRecording) return null;

  return (
    <div className={cn('flex items-center gap-1.5 bg-red-600 text-white px-2 py-1 rounded', className)}>
      <Circle className="h-2 w-2 fill-current animate-pulse" />
      <span className="text-xs font-medium">REC</span>
      {duration && <span className="text-xs font-mono">{duration}</span>}
    </div>
  );
}

export default RecordingBadge;
