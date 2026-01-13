import React from 'react';
import { cn } from '@/lib/utils';
import { Server, Database, Cloud, Globe } from 'lucide-react';

interface InfraStatusProps { services: { name: string; status: 'operational' | 'degraded' | 'down'; latency?: number }[]; className?: string; }

const statusColors = { operational: 'bg-green-500', degraded: 'bg-yellow-500', down: 'bg-red-500' };
const icons = { server: Server, database: Database, cloud: Cloud, api: Globe };

export function InfraStatus({ services, className }: InfraStatusProps) {
  return (
    <div className={cn('p-4 rounded-xl border bg-card', className)}>
      <h3 className="font-bold mb-4">Status da Infraestrutura</h3>
      <div className="space-y-3">
        {services.map((s, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2"><span className={cn('w-2 h-2 rounded-full', statusColors[s.status])} /><span>{s.name}</span></div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">{s.latency && <span>{s.latency}ms</span>}<span className="capitalize">{s.status === 'operational' ? 'Operacional' : s.status === 'degraded' ? 'Degradado' : 'Fora'}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default InfraStatus;
