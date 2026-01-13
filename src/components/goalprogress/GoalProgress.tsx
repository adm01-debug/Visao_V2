import React from 'react';
import { cn } from '@/lib/utils';
import { Zap, Clock, Target, Award } from 'lucide-react';

interface GoalProgressProps { goals: { title: string; current: number; target: number; icon?: React.ReactNode }[]; className?: string; }

export function GoalProgress({ goals, className }: GoalProgressProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {goals.map((goal, i) => {
        const pct = Math.min(100, (goal.current / goal.target) * 100);
        return (
          <div key={i} className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">{goal.icon || <Target className="h-5 w-5 text-primary" />}<span className="font-medium">{goal.title}</span></div>
              <span className="text-sm text-muted-foreground">{goal.current}/{goal.target}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

export default GoalProgress;
