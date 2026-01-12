import React from 'react';
import { cn } from '@/lib/utils';

interface ActivityHeatmapProps {
  data: { date: string; value: number }[];
  colorScale?: string[];
  showLabels?: boolean;
  className?: string;
}

const defaultColors = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];

export function ActivityHeatmap({ data, colorScale = defaultColors, showLabels = true, className }: ActivityHeatmapProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const getColor = (value: number) => colorScale[Math.min(Math.floor((value / maxValue) * (colorScale.length - 1)), colorScale.length - 1)];

  const weeks: { date: string; value: number }[][] = [];
  let currentWeek: { date: string; value: number }[] = [];
  
  data.forEach((d, i) => {
    const dayOfWeek = new Date(d.date).getDay();
    if (dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(d);
  });
  if (currentWeek.length > 0) weeks.push(currentWeek);

  return (
    <div className={cn('overflow-auto', className)}>
      {showLabels && (
        <div className="flex gap-1 mb-1 text-xs text-muted-foreground ml-8">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <span key={d} className="w-3 h-3">{d[0]}</span>)}
        </div>
      )}
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => (
              <div key={di} className="w-3 h-3 rounded-sm" style={{ backgroundColor: getColor(day.value) }} title={`${day.date}: ${day.value}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ActivityHeatmap;
