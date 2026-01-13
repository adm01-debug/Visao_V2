import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DateRange { start: Date | null; end: Date | null; }
interface DateRangePickerProps { value: DateRange; onChange: (range: DateRange) => void; className?: string; }

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date());
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();

  const handleSelect = (day: number) => {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    if (selecting === 'start') { onChange({ start: date, end: null }); setSelecting('end'); }
    else { onChange({ ...value, end: date }); setOpen(false); setSelecting('start'); }
  };

  const isInRange = (day: number) => {
    if (!value.start || !value.end) return false;
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    return date >= value.start && date <= value.end;
  };

  const formatDate = (d: Date | null) => d ? d.toLocaleDateString('pt-BR') : '--/--/----';

  return (
    <div className={cn('relative', className)}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-background">
        <Calendar className="h-4 w-4" />
        <span className="text-sm">{formatDate(value.start)} - {formatDate(value.end)}</span>
      </button>
      {open && (
        <div className="absolute top-full mt-2 p-4 bg-popover border rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => setMonth(new Date(month.setMonth(month.getMonth() - 1)))}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="font-medium">{month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
            <Button variant="ghost" size="icon" onClick={() => setMonth(new Date(month.setMonth(month.getMonth() + 1)))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <span key={i} className="text-muted-foreground">{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }, (_, i) => <span key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
              <button key={day} onClick={() => handleSelect(day)}
                className={cn('w-8 h-8 rounded text-sm hover:bg-accent', isInRange(day) && 'bg-primary/20', 
                  (value.start?.getDate() === day || value.end?.getDate() === day) && 'bg-primary text-primary-foreground')}>{day}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DateRangePicker;
