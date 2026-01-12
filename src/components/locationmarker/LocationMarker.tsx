import React from 'react';
import { cn } from '@/lib/utils';
import { MapPin } from 'lucide-react';

interface LocationMarkerProps {
  name: string;
  status?: 'online' | 'offline' | 'alert';
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

const statusColors = { online: 'bg-green-500', offline: 'bg-gray-500', alert: 'bg-red-500 animate-pulse' };

export function LocationMarker({ name, status = 'online', onClick, selected, className }: LocationMarkerProps) {
  return (
    <button onClick={onClick} className={cn('flex flex-col items-center', className)}>
      <div className={cn('relative', selected && 'scale-125')}>
        <MapPin className={cn('h-8 w-8', status === 'alert' ? 'text-red-500' : status === 'online' ? 'text-primary' : 'text-gray-400')} fill="currentColor" />
        <div className={cn('absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full', statusColors[status])} />
      </div>
      <span className="text-xs mt-1 font-medium whitespace-nowrap">{name}</span>
    </button>
  );
}

export default LocationMarker;
