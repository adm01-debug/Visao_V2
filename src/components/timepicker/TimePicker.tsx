import React from 'react';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  step?: number;
  disabled?: boolean;
  className?: string;
}

export function TimePicker({ value, onChange, min, max, step = 60, disabled = false, className }: TimePickerProps) {
  return (
    <div className={cn('relative', className)}>
      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input type="time" value={value} onChange={e => onChange(e.target.value)} min={min} max={max} step={step} disabled={disabled}
        className="w-full h-10 pl-10 pr-3 rounded-md border bg-background" />
    </div>
  );
}

export default TimePicker;
