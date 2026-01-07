import React from 'react';
import { AlertTriangle, Clock, ChevronRight } from 'lucide-react';
import { useAlerts } from '@/hooks/useAlerts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const severityColors: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-500 text-white',
  medium: 'bg-warning text-warning-foreground',
  low: 'bg-muted text-muted-foreground',
};

export function AlertsListWidget() {
  const { alerts, loading, markAsRead } = useAlerts();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-2 h-full">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse bg-muted rounded h-12" />
        ))}
      </div>
    );
  }

  const recentAlerts = alerts?.slice(0, 8) || [];

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 -mx-4 px-4">
        <div className="space-y-2">
          {recentAlerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                'flex items-start gap-2 p-2 rounded-lg cursor-pointer',
                'hover:bg-muted/50 transition-colors',
                !alert.is_read && 'bg-primary/5 border-l-2 border-primary',
              )}
              onClick={() => {
                markAsRead(alert.id);
                navigate('/alerts');
              }}
            >
              <div className={cn(
                'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
                severityColors[alert.severity] || 'bg-muted',
              )}>
                <AlertTriangle className="h-3 w-3" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{alert.message}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{alert.camera_name}</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {formatDistanceToNow(new Date(alert.timestamp), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </span>
                </div>
              </div>

              <Badge variant="outline" className="text-[9px] flex-shrink-0">
                {alert.type}
              </Badge>
            </div>
          ))}

          {recentAlerts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Nenhum alerta recente
            </div>
          )}
        </div>
      </ScrollArea>

      {recentAlerts.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full text-xs"
          onClick={() => navigate('/alerts')}
        >
          Ver todos os alertas
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      )}
    </div>
  );
}
