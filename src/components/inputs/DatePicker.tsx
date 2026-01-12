import React from 'react';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({ value, onChange, min, max, disabled, className }: DatePickerProps) {
  return (
    <div className={`relative ${className}`}>
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        disabled={disabled}
        className="pr-10"
      />
      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    </div>
  );
}

export default DatePicker;
