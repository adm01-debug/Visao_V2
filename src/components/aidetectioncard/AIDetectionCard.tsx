import React from 'react';
import { cn } from '@/lib/utils';
import { Brain, Eye, Users, Car, Package } from 'lucide-react';

interface Detection {
  type: 'person' | 'vehicle' | 'object' | 'face';
  confidence: number;
  label?: string;
}

interface AIDetectionCardProps {
  detections: Detection[];
  modelName?: string;
  processingTime?: number;
  className?: string;
}

const icons = { person: Users, vehicle: Car, object: Package, face: Eye };

export function AIDetectionCard({ detections, modelName, processingTime, className }: AIDetectionCardProps) {
  const grouped = detections.reduce((acc, d) => {
    acc[d.type] = (acc[d.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Brain className="h-5 w-5 text-primary" />
        <span className="font-medium">Detecção IA</span>
        {modelName && <span className="text-xs text-muted-foreground">({modelName})</span>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(grouped).map(([type, count]) => {
          const Icon = icons[type as keyof typeof icons] || Package;
          return (
            <div key={type} className="flex items-center gap-2 p-2 bg-muted rounded">
              <Icon className="h-4 w-4" />
              <span className="text-sm capitalize">{type}</span>
              <span className="ml-auto font-bold">{count}</span>
            </div>
          );
        })}
      </div>
      {processingTime && <p className="text-xs text-muted-foreground mt-2">Processado em {processingTime}ms</p>}
    </div>
  );
}

export default AIDetectionCard;
