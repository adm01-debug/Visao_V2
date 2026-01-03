/**
 * VISÃO - Sistema de Vigilância Inteligente
 * AlertList Component
 */

import { memo } from 'react';
import { AlertTriangle, Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCard, UIAlert } from './AlertCard';
import { cn } from '@/lib/utils';

interface AlertListProps {
  alerts: UIAlert[];
  onAlertClick?: (alert: UIAlert) => void;
  onMarkAllRead?: () => void;
  onCameraClick?: (cameraId: string) => void;
  searchQuery?: string;
  maxHeight?: string;
  emptyMessage?: string;
  className?: string;
}

function AlertListComponent({
  alerts,
  onAlertClick,
  onMarkAllRead,
  onCameraClick,
  searchQuery = '',
  maxHeight = '500px',
  emptyMessage = 'Nenhum alerta encontrado',
  className
}: AlertListProps) {
  const unreadCount = alerts.filter(a => !a.isRead).length;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Alertas</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-destructive text-destructive-foreground rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && onMarkAllRead && (
          <Button variant="ghost" size="sm" onClick={onMarkAllRead} className="gap-2">
            <CheckCheck className="w-4 h-4" />
            Marcar todas lidas
          </Button>
        )}
      </div>

      {/* Alert List */}
      <ScrollArea style={{ maxHeight }} className="pr-4">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onClick={() => onAlertClick?.(alert)}
                onCameraClick={onCameraClick}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export const AlertList = memo(AlertListComponent);
