import React from 'react';
import { cn } from '@/lib/utils';

interface ScheduleBlock { day: number; startHour: number; endHour: number; type: 'continuous' | 'motion' | 'none'; }
interface RecordingScheduleProps { schedule?: ScheduleBlock[]; onChange?: (schedule: ScheduleBlock[]) => void; className?: string; }

const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const typeColors = { continuous: 'bg-green-500', motion: 'bg-yellow-500', none: 'bg-transparent' };

export function RecordingSchedule({ schedule = [], onChange, className }: RecordingScheduleProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getBlockType = (day: number, hour: number) => {
    const block = schedule.find(s => s.day === day && hour >= s.startHour && hour < s.endHour);
    return block?.type || 'none';
  };

  return (
    <div className={cn('rounded-lg border overflow-auto', className)}>
      <div className="flex">
        <div className="w-12" />
        {hours.map(h => <div key={h} className="w-6 text-xs text-center text-muted-foreground py-1">{h}</div>)}
      </div>
      {days.map((day, d) => (
        <div key={d} className="flex">
          <div className="w-12 text-xs text-right pr-2 py-1">{day}</div>
          {hours.map(h => <div key={h} className={cn('w-6 h-6 border-r border-b', typeColors[getBlockType(d, h)])} />)}
        </div>
      ))}
      <div className="flex gap-4 p-2 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded" />Contínuo</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-500 rounded" />Por movimento</span>
      </div>
    </div>
  );
}

export default RecordingSchedule;
