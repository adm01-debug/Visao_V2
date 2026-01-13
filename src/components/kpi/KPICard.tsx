import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Target } from 'lucide-react';

interface KPICardProps { title: string; value: number; target?: number; unit?: string; className?: string; }

export function KPICard({ title, value, target, unit = '', className }: KPICardProps) {
  const progress = target ? (value / target) * 100 : 100;
  const onTrack = progress >= 100;

  return (
    <div className={cn('p-6 rounded-xl border bg-card', className)}>
      <div className="flex items-center gap-2 mb-4"><Target className="h-5 w-5 text-primary" /><span className="font-medium">{title}</span></div>
      <div className="text-4xl font-bold mb-2">{value.toLocaleString()}{unit}</div>
      {target && (
        <div className="space-y-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden"><div className={cn('h-full rounded-full', onTrack ? 'bg-green-500' : 'bg-yellow-500')} style={{width: `${Math.min(100, progress)}%`}} /></div>
          <div className="flex justify-between text-sm text-muted-foreground"><span>Meta: {target.toLocaleString()}{unit}</span><span className={onTrack ? 'text-green-500' : 'text-yellow-500'}>{progress.toFixed(0)}%</span></div>
        </div>
      )}
    </div>
  );
}

export default KPICard;
