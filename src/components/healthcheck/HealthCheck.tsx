import React from 'react';
import { cn } from '@/lib/utils';
import { Activity, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Service { name: string; status: 'healthy' | 'degraded' | 'down'; latency?: number; }

interface HealthCheckProps {
  services: Service[];
  lastCheck?: Date;
  onRefresh?: () => void;
  loading?: boolean;
  className?: string;
}

const statusConfig = {
  healthy: { color: 'bg-green-500', label: 'Saudável' },
  degraded: { color: 'bg-yellow-500', label: 'Degradado' },
  down: { color: 'bg-red-500', label: 'Offline' }
};

export function HealthCheck({ services, lastCheck, onRefresh, loading, className }: HealthCheckProps) {
  return (
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /><span className="font-medium">Health Check</span></div>
        {onRefresh && <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /></Button>}
      </div>
      <div className="space-y-2">
        {services.map(svc => (
          <div key={svc.name} className="flex items-center gap-3 p-2 rounded bg-muted/50">
            <div className={cn('w-2 h-2 rounded-full', statusConfig[svc.status].color)} />
            <span className="flex-1 text-sm">{svc.name}</span>
            {svc.latency && <span className="text-xs text-muted-foreground">{svc.latency}ms</span>}
            <span className="text-xs text-muted-foreground">{statusConfig[svc.status].label}</span>
          </div>
        ))}
      </div>
      {lastCheck && <p className="text-xs text-muted-foreground mt-3">Última verificação: {lastCheck.toLocaleTimeString('pt-BR')}</p>}
    </div>
  );
}

export default HealthCheck;
