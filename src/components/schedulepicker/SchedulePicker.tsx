import React from 'react';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface TimeSlot { start: string; end: string; }
interface DaySchedule { enabled: boolean; slots: TimeSlot[]; }
type WeekSchedule = Record<string, DaySchedule>;

interface SchedulePickerProps {
  value: WeekSchedule;
  onChange: (schedule: WeekSchedule) => void;
  className?: string;
}

const days = [
  { id: 'mon', label: 'Seg' }, { id: 'tue', label: 'Ter' }, { id: 'wed', label: 'Qua' },
  { id: 'thu', label: 'Qui' }, { id: 'fri', label: 'Sex' }, { id: 'sat', label: 'Sáb' }, { id: 'sun', label: 'Dom' }
];

export function SchedulePicker({ value, onChange, className }: SchedulePickerProps) {
  const toggleDay = (dayId: string) => {
    onChange({ ...value, [dayId]: { ...value[dayId], enabled: !value[dayId]?.enabled } });
  };

  const updateSlot = (dayId: string, field: 'start' | 'end', val: string) => {
    const current = value[dayId]?.slots?.[0] || { start: '08:00', end: '18:00' };
    onChange({ ...value, [dayId]: { ...value[dayId], slots: [{ ...current, [field]: val }] } });
  };

  return (
    <div className={cn('space-y-2', className)}>
      {days.map(day => (
        <div key={day.id} className="flex items-center gap-3 p-2 rounded border">
          <label className="flex items-center gap-2 w-16">
            <input type="checkbox" checked={value[day.id]?.enabled || false} onChange={() => toggleDay(day.id)} />
            <span className="text-sm font-medium">{day.label}</span>
          </label>
          {value[day.id]?.enabled && (
            <div className="flex items-center gap-2">
              <input type="time" value={value[day.id]?.slots?.[0]?.start || '08:00'} onChange={e => updateSlot(day.id, 'start', e.target.value)} className="h-8 px-2 border rounded text-sm" />
              <span>-</span>
              <input type="time" value={value[day.id]?.slots?.[0]?.end || '18:00'} onChange={e => updateSlot(day.id, 'end', e.target.value)} className="h-8 px-2 border rounded text-sm" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default SchedulePicker;
