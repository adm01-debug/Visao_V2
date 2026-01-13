import React from 'react';
import { cn } from '@/lib/utils';
import { Flame, Zap, Star } from 'lucide-react';

interface StreakCounterProps { current: number; best?: number; unit?: string; icon?: React.ReactNode; className?: string; }

export function StreakCounter({ current, best, unit = 'dias', icon, className }: StreakCounterProps) {
  return (
    <div className={cn('p-6 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white', className)}>
      <div className="flex items-center gap-3 mb-4">{icon || <Flame className="h-8 w-8" />}<span className="text-lg font-medium">Sequência Atual</span></div>
      <p className="text-5xl font-bold">{current} <span className="text-2xl font-normal">{unit}</span></p>
      {best && <p className="mt-4 text-white/80 flex items-center gap-2"><Star className="h-4 w-4" />Recorde: {best} {unit}</p>}
    </div>
  );
}

export default StreakCounter;
