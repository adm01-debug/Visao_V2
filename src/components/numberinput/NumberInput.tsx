import React from 'react';
import { cn } from '@/lib/utils';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NumberInputProps { value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number; className?: string; }

export function NumberInput({ value, onChange, min = 0, max = Infinity, step = 1, className }: NumberInputProps) {
  const decrement = () => onChange(Math.max(min, value - step));
  const increment = () => onChange(Math.min(max, value + step));

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button variant="outline" size="icon" onClick={decrement} disabled={value <= min}><Minus className="h-4 w-4" /></Button>
      <input type="number" value={value} onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
        className="w-20 text-center p-2 rounded border bg-background" />
      <Button variant="outline" size="icon" onClick={increment} disabled={value >= max}><Plus className="h-4 w-4" /></Button>
    </div>
  );
}

export default NumberInput;
