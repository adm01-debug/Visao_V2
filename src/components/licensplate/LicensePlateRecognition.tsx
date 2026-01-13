import React from 'react';
import { cn } from '@/lib/utils';
import { Car, Clock, MapPin } from 'lucide-react';

interface PlateReading { id: string; plate: string; timestamp: Date; camera: string; confidence: number; image?: string; }
interface LicensePlateRecognitionProps { readings: PlateReading[]; className?: string; }

export function LicensePlateRecognition({ readings, className }: LicensePlateRecognitionProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {readings.map(r => (
        <div key={r.id} className="flex items-center gap-4 p-3 rounded-lg border bg-card">
          <div className="w-20 h-12 bg-yellow-400 rounded flex items-center justify-center font-mono font-bold text-black">{r.plate}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4" />{r.camera}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{r.timestamp.toLocaleString()}</div>
          </div>
          <span className="text-sm text-green-500">{(r.confidence * 100).toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
}

export default LicensePlateRecognition;
