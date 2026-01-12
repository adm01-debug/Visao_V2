import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, X } from 'lucide-react';

interface Option { value: string; label: string; }

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  maxSelected?: number;
  className?: string;
}

export function MultiSelect({ options, value, onChange, placeholder = 'Selecione...', maxSelected, className }: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const toggle = (val: string) => {
    if (value.includes(val)) onChange(value.filter(v => v !== val));
    else if (!maxSelected || value.length < maxSelected) onChange([...value, val]);
  };

  const selected = options.filter(o => value.includes(o.value));

  return (
    <div className={cn('relative', className)}>
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full min-h-[40px] flex items-center gap-2 px-3 py-2 rounded-md border bg-background text-left">
        <div className="flex-1 flex flex-wrap gap-1">
          {selected.length === 0 ? <span className="text-muted-foreground">{placeholder}</span> :
            selected.map(s => (
              <span key={s.value} className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-sm">
                {s.label}<X className="h-3 w-3 cursor-pointer" onClick={e => { e.stopPropagation(); toggle(s.value); }} />
              </span>
            ))}
        </div>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 w-full bg-popover border rounded-lg shadow-lg z-10 max-h-60 overflow-auto">
          {options.map(opt => (
            <button key={opt.value} type="button" onClick={() => toggle(opt.value)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-left">
              <div className={cn('w-4 h-4 rounded border flex items-center justify-center', value.includes(opt.value) && 'bg-primary border-primary')}>
                {value.includes(opt.value) && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default MultiSelect;
