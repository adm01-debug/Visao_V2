import React from 'react';
import { Camera, AlertTriangle, Users, Shield } from 'lucide-react';
import { useCameras } from '@/hooks/useCameras';
import { useAlerts } from '@/hooks/useAlerts';
import { cn } from '@/lib/utils';

export function StatsWidget() {
  const { cameras, loading: camerasLoading } = useCameras();
  const { alerts, unreadCount, loading: alertsLoading } = useAlerts();

  const stats = React.useMemo(() => {
    const onlineCameras = cameras?.filter(c => c.status === 'online' || c.status === 'alert').length || 0;
    const totalCameras = cameras?.length || 0;
    const totalPeople = cameras?.reduce((sum, c) => sum + (c.detected_people || 0), 0) || 0;
    const criticalAlerts = alerts?.filter(a => a.severity === 'critical' || a.severity === 'high').length || 0;

    return [
      {
        label: 'Câmeras Online',
        value: `${onlineCameras}/${totalCameras}`,
        icon: Camera,
        color: 'text-success',
        bg: 'bg-success/10',
      },
      {
        label: 'Alertas Ativos',
        value: unreadCount,
        icon: AlertTriangle,
        color: unreadCount > 0 ? 'text-destructive' : 'text-muted-foreground',
        bg: unreadCount > 0 ? 'bg-destructive/10' : 'bg-muted',
      },
      {
        label: 'Pessoas Detectadas',
        value: totalPeople,
        icon: Users,
        color: 'text-primary',
        bg: 'bg-primary/10',
      },
      {
        label: 'Alertas Críticos',
        value: criticalAlerts,
        icon: Shield,
        color: criticalAlerts > 0 ? 'text-warning' : 'text-muted-foreground',
        bg: criticalAlerts > 0 ? 'bg-warning/10' : 'bg-muted',
      },
    ];
  }, [cameras, alerts, unreadCount]);

  if (camerasLoading || alertsLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 h-full">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse bg-muted rounded-lg h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 h-full">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={cn(
            'flex flex-col items-center justify-center p-3 rounded-lg',
            stat.bg,
          )}
        >
          <stat.icon className={cn('h-5 w-5 mb-1', stat.color)} />
          <span className="text-2xl font-bold">{stat.value}</span>
          <span className="text-[10px] text-muted-foreground text-center">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
