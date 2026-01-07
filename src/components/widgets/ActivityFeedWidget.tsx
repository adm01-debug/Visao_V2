import React from 'react';
import { Activity, Camera, User, Car, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAlerts } from '@/hooks/useAlerts';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const activityIcons: Record<string, React.ElementType> = {
  security: AlertTriangle,
  safety: Activity,
  operations: Camera,
  access: User,
  analytics: Car,
};

const activityColors: Record<string, string> = {
  security: 'text-destructive bg-destructive/10',
  safety: 'text-warning bg-warning/10',
  operations: 'text-primary bg-primary/10',
  access: 'text-success bg-success/10',
  analytics: 'text-info bg-info/10',
};

export function ActivityFeedWidget() {
  const { alerts, loading } = useAlerts();

  if (loading) {
    return (
      <div className="space-y-3 h-full">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="animate-pulse bg-muted rounded-full w-8 h-8" />
            <div className="flex-1 space-y-1">
              <div className="animate-pulse bg-muted rounded h-3 w-3/4" />
              <div className="animate-pulse bg-muted rounded h-2 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const activities = alerts?.slice(0, 10) || [];

  return (
    <ScrollArea className="h-full -mx-4 px-4">
      <div className="space-y-3">
        {activities.map((activity) => {
          const Icon = activityIcons[activity.type] || Activity;
          const colorClass = activityColors[activity.type] || 'text-muted-foreground bg-muted';
          
          return (
            <div key={activity.id} className="flex items-start gap-2">
              <div className={cn(
                'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center',
                colorClass,
              )}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-xs leading-tight">{activity.message}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {activity.camera_name} • {formatDistanceToNow(new Date(activity.timestamp), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </p>
              </div>
            </div>
          );
        })}

        {activities.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Nenhuma atividade recente
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
