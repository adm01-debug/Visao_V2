import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';
import { maskDate } from '@/lib/mask';

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: boolean;
  className?: string;
}

export function DateInput({ value, onChange, placeholder = 'DD/MM/AAAA', error, className }: DateInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(maskDate(e.target.value));
  };

  return (
    <div className="relative">
      <Input value={value} onChange={handleChange} placeholder={placeholder}
        className={cn('pr-10', error && 'border-destructive', className)} />
      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    </div>
  );
}

export default DateInput;
