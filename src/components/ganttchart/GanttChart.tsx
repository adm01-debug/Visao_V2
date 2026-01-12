import React from 'react';
import { cn } from '@/lib/utils';

interface Task { id: string; name: string; start: Date; end: Date; progress: number; color?: string; }

interface GanttChartProps {
  tasks: Task[];
  startDate: Date;
  endDate: Date;
  className?: string;
}

export function GanttChart({ tasks, startDate, endDate, className }: GanttChartProps) {
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const getPosition = (date: Date) => {
    const days = Math.ceil((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return (days / totalDays) * 100;
  };

  const getWidth = (start: Date, end: Date) => {
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return (days / totalDays) * 100;
  };

  return (
    <div className={cn('rounded-lg border overflow-hidden', className)}>
      <div className="flex bg-muted/50 border-b text-xs">
        <div className="w-48 p-2 font-medium border-r">Tarefa</div>
        <div className="flex-1 flex">{Array.from({ length: Math.min(totalDays, 30) }, (_, i) => {
          const d = new Date(startDate); d.setDate(d.getDate() + i);
          return <div key={i} className="flex-1 p-1 text-center border-r text-muted-foreground">{d.getDate()}</div>;
        })}</div>
      </div>
      {tasks.map(task => (
        <div key={task.id} className="flex border-b last:border-0">
          <div className="w-48 p-2 text-sm border-r truncate">{task.name}</div>
          <div className="flex-1 relative h-10 bg-muted/20">
            <div className="absolute top-2 h-6 rounded" style={{ left: `${getPosition(task.start)}%`, width: `${getWidth(task.start, task.end)}%`, backgroundColor: task.color || '#3b82f6' }}>
              <div className="h-full bg-black/20 rounded" style={{ width: `${task.progress}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default GanttChart;
