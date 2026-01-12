import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function Calculator({ className }: { className?: string }) {
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);

  const handleNumber = (n: string) => setDisplay(d => d === '0' ? n : d + n);
  const handleOp = (o: string) => { setPrev(parseFloat(display)); setOp(o); setDisplay('0'); };
  const calculate = () => {
    if (prev === null || !op) return;
    const curr = parseFloat(display);
    let result = 0;
    if (op === '+') result = prev + curr;
    else if (op === '-') result = prev - curr;
    else if (op === '*') result = prev * curr;
    else if (op === '/') result = curr !== 0 ? prev / curr : 0;
    setDisplay(String(result));
    setPrev(null);
    setOp(null);
  };
  const clear = () => { setDisplay('0'); setPrev(null); setOp(null); };

  const buttons = ['7','8','9','/','4','5','6','*','1','2','3','-','0','C','=','+'];

  return (
    <div className={cn('w-64 p-4 rounded-lg border bg-card', className)}>
      <div className="mb-4 p-3 bg-muted rounded text-right text-2xl font-mono">{display}</div>
      <div className="grid grid-cols-4 gap-2">
        {buttons.map(b => (
          <Button key={b} variant={['+','-','*','/'].includes(b) ? 'secondary' : b === '=' ? 'default' : 'outline'}
            onClick={() => b === 'C' ? clear() : b === '=' ? calculate() : ['+','-','*','/'].includes(b) ? handleOp(b) : handleNumber(b)}>{b}</Button>
        ))}
      </div>
    </div>
  );
}

export default Calculator;
