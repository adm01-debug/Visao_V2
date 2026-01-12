import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets?: { label: string; getValue: () => DateRange }[];
  className?: string;
}

export function DateRangePicker({ value, onChange, presets, className }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (date: Date | null) => date ? date.toLocaleDateString('pt-BR') : '--/--/----';

  return (
    <div className={cn('relative', className)}>
      <Button variant="outline" onClick={() => setIsOpen(!isOpen)} className="justify-between min-w-[240px]">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(value.start)} - {formatDate(value.end)}</span>
        </div>
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </Button>
      {isOpen && (
        <div className="absolute top-full mt-1 left-0 bg-popover border rounded-lg shadow-lg z-50 p-3 min-w-[240px]">
          {presets && presets.length > 0 && (
            <div className="space-y-1 mb-3">
              {presets.map((preset, i) => (
                <button key={i} onClick={() => { onChange(preset.getValue()); setIsOpen(false); }}
                  className="w-full text-left px-2 py-1 rounded hover:bg-accent text-sm">{preset.label}</button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Início</label>
              <input type="date" className="w-full text-sm border rounded px-2 py-1"
                value={value.start?.toISOString().split('T')[0] || ''}
                onChange={e => onChange({ ...value, start: e.target.value ? new Date(e.target.value) : null })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Fim</label>
              <input type="date" className="w-full text-sm border rounded px-2 py-1"
                value={value.end?.toISOString().split('T')[0] || ''}
                onChange={e => onChange({ ...value, end: e.target.value ? new Date(e.target.value) : null })} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DateRangePicker;
