import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, Shield, ShieldOff } from 'lucide-react';

interface Zone {
  id: string;
  name: string;
  points: { x: number; y: number }[];
  armed: boolean;
  triggered?: boolean;
}

interface IntrusionZoneProps {
  zones: Zone[];
  onZoneToggle?: (zone: Zone) => void;
  onZoneClick?: (zone: Zone) => void;
  className?: string;
}

export function IntrusionZone({ zones, onZoneToggle, onZoneClick, className }: IntrusionZoneProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {zones.map(zone => (
        <div key={zone.id}
          className={cn('flex items-center gap-3 p-3 rounded-lg border transition-colors',
            zone.triggered ? 'bg-red-50 border-red-300' : zone.armed ? 'bg-green-50 border-green-300' : 'bg-muted')}>
          <button onClick={() => onZoneToggle?.(zone)}
            className={cn('p-2 rounded-full', zone.armed ? 'bg-green-500 text-white' : 'bg-gray-300')}>
            {zone.armed ? <Shield className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
          </button>
          <div className="flex-1" onClick={() => onZoneClick?.(zone)}>
            <p className="font-medium">{zone.name}</p>
            <p className="text-xs text-muted-foreground">
              {zone.triggered ? 'INTRUSÃO DETECTADA!' : zone.armed ? 'Armada' : 'Desarmada'}
            </p>
          </div>
          {zone.triggered && <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />}
        </div>
      ))}
    </div>
  );
}

export default IntrusionZone;
