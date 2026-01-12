import React from 'react';
import { cn } from '@/lib/utils';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InputNumberProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

export function InputNumber({ value, onChange, min, max, step = 1, disabled = false, className }: InputNumberProps) {
  const decrease = () => {
    const newVal = value - step;
    if (min === undefined || newVal >= min) onChange(newVal);
  };

  const increase = () => {
    const newVal = value + step;
    if (max === undefined || newVal <= max) onChange(newVal);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button type="button" variant="outline" size="icon" onClick={decrease} disabled={disabled || (min !== undefined && value <= min)}>
        <Minus className="h-4 w-4" />
      </Button>
      <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} min={min} max={max} step={step} disabled={disabled}
        className="w-20 h-10 text-center rounded-md border bg-background" />
      <Button type="button" variant="outline" size="icon" onClick={increase} disabled={disabled || (max !== undefined && value >= max)}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default InputNumber;
