import React from 'react';
import { cn } from '@/lib/utils';
import { Cpu, HardDrive, Wifi, Database, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface DiagnosticItem { name: string; status: 'ok' | 'warning' | 'error'; value?: string; }

interface SystemDiagnosticProps {
  cpu: DiagnosticItem;
  memory: DiagnosticItem;
  storage: DiagnosticItem;
  network: DiagnosticItem;
  database: DiagnosticItem;
  className?: string;
}

const icons = { cpu: Cpu, memory: Cpu, storage: HardDrive, network: Wifi, database: Database };
const statusIcons = { ok: CheckCircle, warning: AlertTriangle, error: XCircle };
const statusColors = { ok: 'text-green-500', warning: 'text-yellow-500', error: 'text-red-500' };

export function SystemDiagnostic({ cpu, memory, storage, network, database, className }: SystemDiagnosticProps) {
  const items = [
    { key: 'cpu', label: 'CPU', data: cpu },
    { key: 'memory', label: 'Memória', data: memory },
    { key: 'storage', label: 'Armazenamento', data: storage },
    { key: 'network', label: 'Rede', data: network },
    { key: 'database', label: 'Banco de Dados', data: database },
  ] as const;

  return (
    <div className={cn('grid gap-3', className)}>
      {items.map(item => {
        const Icon = icons[item.key];
        const StatusIcon = statusIcons[item.data.status];
        return (
          <div key={item.key} className="flex items-center gap-3 p-3 rounded-lg border">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1"><p className="font-medium text-sm">{item.label}</p>{item.data.value && <p className="text-xs text-muted-foreground">{item.data.value}</p>}</div>
            <StatusIcon className={cn('h-5 w-5', statusColors[item.data.status])} />
          </div>
        );
      })}
    </div>
  );
}

export default SystemDiagnostic;
