import React from 'react';
import { Activity, Wifi, Database, Cpu, CheckCircle2, XCircle } from 'lucide-react';
import { useCameras } from '@/hooks/useCameras';
import { cn } from '@/lib/utils';

export function SystemHealthWidget() {
  const { cameras, loading } = useCameras();

  const healthStatus = React.useMemo(() => {
    const totalCameras = cameras?.length || 0;
    const onlineCameras = cameras?.filter(c => c.status === 'online' || c.status === 'alert').length || 0;
    const cameraHealth = totalCameras > 0 ? (onlineCameras / totalCameras) * 100 : 100;

    return {
      overall: cameraHealth >= 80 ? 'healthy' : cameraHealth >= 50 ? 'warning' : 'critical',
      cameraHealth,
      networkStatus: 'online', // In real app, check actual network status
      databaseStatus: 'online', // In real app, check database connection
    };
  }, [cameras]);

  const overallColor = {
    healthy: 'text-success',
    warning: 'text-warning',
    critical: 'text-destructive',
  }[healthStatus.overall];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full animate-pulse">
        <div className="bg-muted rounded-full w-12 h-12 mb-2" />
        <div className="bg-muted rounded w-16 h-4" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', 
        healthStatus.overall === 'healthy' ? 'bg-success/10' : 
        healthStatus.overall === 'warning' ? 'bg-warning/10' : 'bg-destructive/10'
      )}>
        <Activity className={cn('h-6 w-6', overallColor)} />
      </div>

      <span className={cn('text-lg font-bold mt-2', overallColor)}>
        {healthStatus.overall === 'healthy' ? 'Saudável' : 
         healthStatus.overall === 'warning' ? 'Atenção' : 'Crítico'}
      </span>

      <div className="flex items-center gap-3 mt-2">
        <StatusIndicator 
          icon={Wifi} 
          status={healthStatus.networkStatus === 'online'} 
          label="Rede" 
        />
        <StatusIndicator 
          icon={Database} 
          status={healthStatus.databaseStatus === 'online'} 
          label="DB" 
        />
        <StatusIndicator 
          icon={Cpu} 
          status={healthStatus.cameraHealth >= 50} 
          label={`${Math.round(healthStatus.cameraHealth)}%`} 
        />
      </div>
    </div>
  );
}

function StatusIndicator({ 
  icon: Icon, 
  status, 
  label 
}: { 
  icon: React.ElementType; 
  status: boolean; 
  label: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <Icon className={cn('h-3.5 w-3.5', status ? 'text-success' : 'text-destructive')} />
      <span className="text-[8px] text-muted-foreground">{label}</span>
    </div>
  );
}
