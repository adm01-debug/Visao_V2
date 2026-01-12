import React from 'react';
import { cn } from '@/lib/utils';
import { Camera, Video, AlertTriangle, Settings } from 'lucide-react';
import { StatusDot } from '@/components/statusdot/StatusDot';

interface CameraCardProps {
  id: string;
  name: string;
  location?: string;
  thumbnail?: string;
  status: 'online' | 'offline' | 'recording' | 'alert';
  lastSeen?: string;
  onClick?: () => void;
  onSettings?: () => void;
  className?: string;
}

export function CameraCard({ id, name, location, thumbnail, status, lastSeen, onClick, onSettings, className }: CameraCardProps) {
  const statusMap = { online: 'online', offline: 'offline', recording: 'busy', alert: 'away' } as const;

  return (
    <div className={cn('rounded-lg border overflow-hidden bg-card', className)}>
      <div className="relative aspect-video bg-muted cursor-pointer" onClick={onClick}>
        {thumbnail ? (
          <img src={thumbnail} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Camera className="h-8 w-8 text-muted-foreground" /></div>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 rounded px-2 py-1">
          <StatusDot status={statusMap[status]} size="sm" pulse={status === 'recording'} />
          <span className="text-xs text-white">{status === 'recording' ? 'REC' : status.toUpperCase()}</span>
        </div>
        {status === 'alert' && <AlertTriangle className="absolute top-2 right-2 h-5 w-5 text-yellow-500" />}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium truncate">{name}</p>
            {location && <p className="text-xs text-muted-foreground">{location}</p>}
          </div>
          {onSettings && <button onClick={onSettings}><Settings className="h-4 w-4 text-muted-foreground" /></button>}
        </div>
        {lastSeen && <p className="text-xs text-muted-foreground mt-1">Última vez: {lastSeen}</p>}
      </div>
    </div>
  );
}

export default CameraCard;
