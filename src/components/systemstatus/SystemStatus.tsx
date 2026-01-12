import React from 'react';
import { cn } from '@/lib/utils';
import { Server, Cpu, HardDrive, Wifi, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  status: 'ok' | 'warning' | 'critical';
}

interface SystemStatusProps {
  metrics: SystemMetric[];
  className?: string;
}

const icons = { CPU: Cpu, RAM: Server, Disco: HardDrive, Rede: Wifi };
const statusIcons = { ok: CheckCircle, warning: AlertTriangle, critical: XCircle };
const statusColors = { ok: 'text-green-500', warning: 'text-yellow-500', critical: 'text-red-500' };

export function SystemStatus({ metrics, className }: SystemStatusProps) {
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {metrics.map((m, i) => {
        const Icon = icons[m.name as keyof typeof icons] || Server;
        const StatusIcon = statusIcons[m.status];
        return (
          <div key={i} className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-2">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <StatusIcon className={cn('h-4 w-4', statusColors[m.status])} />
            </div>
            <p className="text-2xl font-bold">{m.value}{m.unit}</p>
            <p className="text-sm text-muted-foreground">{m.name}</p>
          </div>
        );
      })}
    </div>
  );
}

export default SystemStatus;
