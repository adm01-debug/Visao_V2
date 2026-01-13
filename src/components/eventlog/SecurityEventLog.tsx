import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, Camera, User, Car, Shield, Clock } from 'lucide-react';

interface Event { id: string; type: 'motion' | 'person' | 'vehicle' | 'alert' | 'system'; camera: string; timestamp: Date; description: string; }
interface SecurityEventLogProps { events: Event[]; className?: string; }

const icons = { motion: AlertTriangle, person: User, vehicle: Car, alert: Shield, system: Camera };
const colors = { motion: 'text-yellow-500', person: 'text-blue-500', vehicle: 'text-purple-500', alert: 'text-red-500', system: 'text-gray-500' };

export function SecurityEventLog({ events, className }: SecurityEventLogProps) {
  return (
    <div className={cn('rounded-lg border divide-y max-h-96 overflow-auto', className)}>
      {events.map(e => {
        const Icon = icons[e.type];
        return (
          <div key={e.id} className="flex items-start gap-3 p-3 hover:bg-muted/50">
            <Icon className={cn('h-5 w-5 mt-0.5', colors[e.type])} />
            <div className="flex-1">
              <p className="text-sm font-medium">{e.description}</p>
              <p className="text-xs text-muted-foreground">{e.camera}</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />{e.timestamp.toLocaleTimeString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default SecurityEventLog;
