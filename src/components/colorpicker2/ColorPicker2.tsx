import React from 'react';
import { cn } from '@/lib/utils';

interface ColorPicker2Props {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

const presets = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#000000','#ffffff'];

export function ColorPicker2({ value, onChange, className }: ColorPicker2Props) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-3">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-12 h-12 rounded cursor-pointer border-0" />
        <input type="text" value={value} onChange={e => onChange(e.target.value)} className="flex-1 px-3 py-2 rounded border font-mono text-sm" />
      </div>
      <div className="flex gap-2">{presets.map(c => (
        <button key={c} onClick={() => onChange(c)} className={cn('w-6 h-6 rounded border-2', value === c ? 'border-primary' : 'border-transparent')} style={{ backgroundColor: c }} />
      ))}</div>
    </div>
  );
}

export default ColorPicker2;
