import React from 'react';
import { cn } from '@/lib/utils';
import { Car, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface PlateResult {
  id: string;
  plate: string;
  confidence: number;
  status: 'authorized' | 'unauthorized' | 'unknown';
  timestamp: string;
  vehicle?: string;
}

interface LicensePlateRecognitionProps {
  results: PlateResult[];
  onResultClick?: (result: PlateResult) => void;
  className?: string;
}

const statusConfig = {
  authorized: { icon: CheckCircle, color: 'text-green-500', label: 'Autorizado' },
  unauthorized: { icon: XCircle, color: 'text-red-500', label: 'Não Autorizado' },
  unknown: { icon: AlertTriangle, color: 'text-yellow-500', label: 'Desconhecido' },
};

export function LicensePlateRecognition({ results, onResultClick, className }: LicensePlateRecognitionProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {results.map(result => {
        const config = statusConfig[result.status];
        const Icon = config.icon;
        return (
          <div key={result.id} onClick={() => onResultClick?.(result)}
            className={cn('flex items-center gap-3 p-3 rounded-lg border', onResultClick && 'cursor-pointer hover:bg-accent/50')}>
            <Car className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-mono font-bold">{result.plate}</p>
              {result.vehicle && <p className="text-xs text-muted-foreground">{result.vehicle}</p>}
            </div>
            <div className="text-right">
              <div className={cn('flex items-center gap-1', config.color)}>
                <Icon className="h-4 w-4" />
                <span className="text-sm">{config.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{result.timestamp}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default LicensePlateRecognition;
