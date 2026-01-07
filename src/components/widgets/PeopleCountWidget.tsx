import React from 'react';
import { Users, TrendingUp, TrendingDown } from 'lucide-react';
import { useCameras } from '@/hooks/useCameras';
import { cn } from '@/lib/utils';

export function PeopleCountWidget() {
  const { cameras, loading } = useCameras();

  const totalPeople = React.useMemo(() => {
    return cameras?.reduce((sum, c) => sum + (c.detected_people || 0), 0) || 0;
  }, [cameras]);

  // Simulated trend (in real app, compare with historical data)
  const trend = 12; // percentage change
  const isPositive = trend >= 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full animate-pulse">
        <div className="bg-muted rounded-full w-16 h-16 mb-2" />
        <div className="bg-muted rounded w-20 h-6" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <div className={cn(
          'absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-0.5',
          isPositive ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive',
        )}>
          {isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
          {Math.abs(trend)}%
        </div>
      </div>
      
      <span className="text-3xl font-bold mt-2">{totalPeople}</span>
      <span className="text-xs text-muted-foreground">pessoas detectadas</span>
    </div>
  );
}
