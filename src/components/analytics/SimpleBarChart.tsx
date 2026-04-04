import { cn } from '@/lib/utils';

export interface ChartDataPoint {
  date: string;
  label: string;
  alerts: number;
  analyses: number;
  detections: number;
  recordings: number;
}

interface SimpleBarChartProps {
  data: ChartDataPoint[];
  dataKey: keyof ChartDataPoint;
  color: string;
  height?: number;
}

export function SimpleBarChart({ data, dataKey, color, height = 200 }: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map(d => Number(d[dataKey]) || 0), 1);

  return (
    <div className="flex items-end gap-1 h-full" style={{ height }}>
      {data.map((item, index) => {
        const value = Number(item[dataKey]) || 0;
        const barHeight = (value / maxValue) * 100;
        return (
          <div key={index} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="relative w-full flex flex-col items-center">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                {item.label}: {value}
              </div>
              <div className={cn('w-full rounded-t transition-all', color)} style={{ height: `${barHeight}%`, minHeight: value > 0 ? 4 : 0 }} />
            </div>
            <span className="text-[9px] text-muted-foreground truncate w-full text-center">{item.label.split(' ')[0]}</span>
          </div>
        );
      })}
    </div>
  );
}
