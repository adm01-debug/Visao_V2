import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Event { id: string; date: Date; title: string; type?: string; }

interface EventCalendarProps {
  events: Event[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: Event) => void;
  className?: string;
}

export function EventCalendar({ events, onDateClick, onEventClick, className }: EventCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear(), month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const days = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDay + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });

  const getEventsForDay = (day: number) => events.filter(e => {
    const d = new Date(e.date);
    return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
  });

  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month - 1))}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="font-medium">{currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month + 1))}><ChevronRight className="h-4 w-4" /></Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {['D','S','T','Q','Q','S','S'].map((d,i) => <div key={i} className="p-2 font-medium text-muted-foreground">{d}</div>)}
        {days.map((day, i) => {
          const dayEvents = day ? getEventsForDay(day) : [];
          return (
            <div key={i} onClick={() => day && onDateClick?.(new Date(year, month, day))}
              className={cn('p-2 min-h-[60px] rounded cursor-pointer hover:bg-accent', day && 'border')}>
              {day && <><span className="text-sm">{day}</span>
                {dayEvents.slice(0,2).map(e => (
                  <div key={e.id} onClick={ev => { ev.stopPropagation(); onEventClick?.(e); }}
                    className="text-xs p-0.5 mt-0.5 rounded bg-primary/10 truncate">{e.title}</div>
                ))}
                {dayEvents.length > 2 && <span className="text-xs text-muted-foreground">+{dayEvents.length-2}</span>}
              </>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default EventCalendar;
