import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';

interface CounterProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export function Counter({ value, onChange, min = 0, max = Infinity, step = 1, className }: CounterProps) {
  const decrement = () => onChange(Math.max(min, value - step));
  const increment = () => onChange(Math.min(max, value + step));

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <Button variant="outline" size="icon" onClick={decrement} disabled={value <= min}>
        <Minus className="h-4 w-4" />
      </Button>
      <span className="w-12 text-center font-medium">{value}</span>
      <Button variant="outline" size="icon" onClick={increment} disabled={value >= max}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default Counter;
