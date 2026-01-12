import React from 'react';
import { cn } from '@/lib/utils';

interface ScheduleSlot {
  day: number;
  hour: number;
  active: boolean;
}

interface RecordingScheduleProps {
  schedule: ScheduleSlot[];
  onChange?: (slot: ScheduleSlot) => void;
  readOnly?: boolean;
  className?: string;
}

const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const hours = Array.from({ length: 24 }, (_, i) => i);

export function RecordingSchedule({ schedule, onChange, readOnly = false, className }: RecordingScheduleProps) {
  const isActive = (day: number, hour: number) => schedule.some(s => s.day === day && s.hour === hour && s.active);

  return (
    <div className={cn('overflow-x-auto', className)}>
      <div className="min-w-[600px]">
        <div className="grid grid-cols-[60px_repeat(24,1fr)] gap-px">
          <div />
          {hours.map(h => <div key={h} className="text-xs text-center text-muted-foreground">{h}</div>)}
        </div>
        {days.map((day, d) => (
          <div key={d} className="grid grid-cols-[60px_repeat(24,1fr)] gap-px mt-px">
            <div className="text-xs text-muted-foreground flex items-center">{day}</div>
            {hours.map(h => (
              <button key={h} disabled={readOnly}
                onClick={() => onChange?.({ day: d, hour: h, active: !isActive(d, h) })}
                className={cn('h-4 rounded-sm transition-colors', isActive(d, h) ? 'bg-primary' : 'bg-muted hover:bg-muted-foreground/20')} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecordingSchedule;
