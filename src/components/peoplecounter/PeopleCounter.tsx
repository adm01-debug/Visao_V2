import React from 'react';
import { cn } from '@/lib/utils';
import { Users, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface PeopleCounterProps {
  current: number;
  entering?: number;
  exiting?: number;
  capacity?: number;
  className?: string;
}

export function PeopleCounter({ current, entering = 0, exiting = 0, capacity, className }: PeopleCounterProps) {
  const percentage = capacity ? Math.round((current / capacity) * 100) : null;
  const isOverCapacity = capacity && current > capacity;

  return (
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-5 w-5 text-primary" />
        <span className="font-medium">Contagem de Pessoas</span>
      </div>
      <div className="text-center mb-4">
        <p className={cn('text-4xl font-bold', isOverCapacity && 'text-red-500')}>{current}</p>
        {capacity && (
          <p className="text-sm text-muted-foreground">
            de {capacity} ({percentage}%)
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
          <ArrowUp className="h-4 w-4 text-green-500" />
          <span className="text-sm">Entrando</span>
          <span className="ml-auto font-bold text-green-600">{entering}</span>
        </div>
        <div className="flex items-center gap-2 p-2 bg-red-50 rounded">
          <ArrowDown className="h-4 w-4 text-red-500" />
          <span className="text-sm">Saindo</span>
          <span className="ml-auto font-bold text-red-600">{exiting}</span>
        </div>
      </div>
      {capacity && (
        <div className="mt-3">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className={cn('h-full transition-all', isOverCapacity ? 'bg-red-500' : 'bg-primary')}
              style={{ width: `${Math.min(percentage || 0, 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default PeopleCounter;
