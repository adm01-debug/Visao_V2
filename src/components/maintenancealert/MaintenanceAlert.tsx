import React from 'react';
import { cn } from '@/lib/utils';
import { Wrench, Calendar, Clock } from 'lucide-react';

interface MaintenanceAlertProps {
  title?: string;
  message: string;
  scheduledAt: Date;
  estimatedDuration?: string;
  className?: string;
}

export function MaintenanceAlert({ title = 'Manutenção Programada', message, scheduledAt, estimatedDuration, className }: MaintenanceAlertProps) {
  return (
    <div className={cn('p-4 rounded-lg bg-yellow-50 border border-yellow-200', className)}>
      <div className="flex items-center gap-2 mb-2">
        <Wrench className="h-5 w-5 text-yellow-600" />
        <span className="font-medium text-yellow-800">{title}</span>
      </div>
      <p className="text-sm text-yellow-700 mb-2">{message}</p>
      <div className="flex items-center gap-4 text-xs text-yellow-600">
        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{scheduledAt.toLocaleDateString('pt-BR')}</span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{scheduledAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        {estimatedDuration && <span>Duração: ~{estimatedDuration}</span>}
      </div>
    </div>
  );
}

export default MaintenanceAlert;
