import React from 'react';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  presets?: string[];
  className?: string;
}

const defaultPresets = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'];

export function ColorPicker({ value, onChange, presets = defaultPresets, className }: ColorPickerProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
        <input type="text" value={value} onChange={e => onChange(e.target.value)} className="flex-1 h-10 px-3 rounded-md border bg-background font-mono text-sm" />
      </div>
      <div className="flex flex-wrap gap-1">
        {presets.map(color => (
          <button key={color} onClick={() => onChange(color)}
            className={cn('w-6 h-6 rounded border-2', value === color ? 'border-primary' : 'border-transparent')}
            style={{ backgroundColor: color }} />
        ))}
      </div>
    </div>
  );
}

export default ColorPicker;
