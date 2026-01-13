import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';

interface Service { name: string; status: 'operational' | 'degraded' | 'outage' | 'maintenance'; uptime?: number; }
interface StatusPageProps { services: Service[]; title?: string; className?: string; }

const statusConfig = {
  operational: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500', label: 'Operacional' },
  degraded: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500', label: 'Degradado' },
  outage: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500', label: 'Indisponível' },
  maintenance: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500', label: 'Manutenção' },
};

export function StatusPage({ services, title = 'Status dos Serviços', className }: StatusPageProps) {
  const allOk = services.every(s => s.status === 'operational');

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <div className={cn('p-6 text-center', allOk ? 'bg-green-50' : 'bg-yellow-50')}>
        {allOk ? <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" /> : <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-2" />}
        <h2 className="text-xl font-bold">{allOk ? 'Todos os sistemas operacionais' : 'Alguns serviços afetados'}</h2>
      </div>
      <div className="divide-y">
        {services.map(service => {
          const config = statusConfig[service.status];
          const Icon = config.icon;
          return (
            <div key={service.name} className="flex items-center justify-between p-4">
              <span className="font-medium">{service.name}</span>
              <div className="flex items-center gap-3">
                {service.uptime && <span className="text-sm text-muted-foreground">{service.uptime}% uptime</span>}
                <div className="flex items-center gap-2"><Icon className={cn('h-4 w-4', config.color)} /><span className="text-sm">{config.label}</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StatusPage;
