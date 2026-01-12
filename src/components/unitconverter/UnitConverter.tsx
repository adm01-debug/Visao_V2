import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ArrowRightLeft } from 'lucide-react';

const conversions = {
  'km-mi': { factor: 0.621371, from: 'km', to: 'mi' },
  'kg-lb': { factor: 2.20462, from: 'kg', to: 'lb' },
  'c-f': { factor: 1.8, offset: 32, from: '°C', to: '°F' },
};

export function UnitConverter({ className }: { className?: string }) {
  const [type, setType] = useState<keyof typeof conversions>('km-mi');
  const [value, setValue] = useState('');

  const conv = conversions[type];
  const result = value ? (parseFloat(value) * conv.factor + (conv.offset || 0)).toFixed(2) : '';

  return (
    <div className={cn('p-4 rounded-lg border bg-card space-y-4', className)}>
      <select value={type} onChange={e => setType(e.target.value as keyof typeof conversions)} className="w-full p-2 rounded border">
        <option value="km-mi">Quilômetros ↔ Milhas</option>
        <option value="kg-lb">Quilos ↔ Libras</option>
        <option value="c-f">Celsius ↔ Fahrenheit</option>
      </select>
      <div className="flex items-center gap-2">
        <div className="flex-1"><input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="0" className="w-full p-2 rounded border text-center" /><p className="text-xs text-center text-muted-foreground mt-1">{conv.from}</p></div>
        <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1"><div className="w-full p-2 rounded bg-muted text-center font-medium">{result || '0'}</div><p className="text-xs text-center text-muted-foreground mt-1">{conv.to}</p></div>
      </div>
    </div>
  );
}

export default UnitConverter;
