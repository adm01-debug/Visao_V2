import React from 'react';
import { cn } from '@/lib/utils';
import { AlertEvent } from '@/components/alertevent/AlertEvent';

interface Event {
  id: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  source?: string;
}

interface EventLogProps {
  events: Event[];
  maxHeight?: string;
  onEventClick?: (event: Event) => void;
  onEventDismiss?: (id: string) => void;
  className?: string;
}

export function EventLog({ events, maxHeight = '400px', onEventClick, onEventDismiss, className }: EventLogProps) {
  return (
    <div className={cn('space-y-2 overflow-y-auto', className)} style={{ maxHeight }}>
      {events.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhum evento registrado</p>
      ) : (
        events.map(event => (
          <AlertEvent
            key={event.id}
            severity={event.severity}
            title={event.title}
            message={event.message}
            timestamp={event.timestamp}
            source={event.source}
            onClick={() => onEventClick?.(event)}
            onDismiss={onEventDismiss ? () => onEventDismiss(event.id) : undefined}
          />
        ))
      )}
    </div>
  );
}

export default EventLog;
