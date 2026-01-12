import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Wifi } from 'lucide-react';

interface NetworkMonitorProps {
  downloadSpeed: number;
  uploadSpeed: number;
  latency: number;
  packetLoss: number;
  className?: string;
}

function formatSpeed(mbps: number): string {
  return mbps >= 1000 ? `${(mbps/1000).toFixed(1)} Gbps` : `${mbps.toFixed(1)} Mbps`;
}

export function NetworkMonitor({ downloadSpeed, uploadSpeed, latency, packetLoss, className }: NetworkMonitorProps) {
  return (
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      <div className="flex items-center gap-2 mb-3"><Wifi className="h-5 w-5 text-primary" /><span className="font-medium">Monitor de Rede</span></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded bg-green-50">
          <div className="flex items-center gap-1 text-green-600"><ArrowDown className="h-4 w-4" /><span className="text-xs">Download</span></div>
          <p className="text-lg font-bold text-green-700">{formatSpeed(downloadSpeed)}</p>
        </div>
        <div className="p-3 rounded bg-blue-50">
          <div className="flex items-center gap-1 text-blue-600"><ArrowUp className="h-4 w-4" /><span className="text-xs">Upload</span></div>
          <p className="text-lg font-bold text-blue-700">{formatSpeed(uploadSpeed)}</p>
        </div>
        <div className="p-3 rounded bg-muted">
          <p className="text-xs text-muted-foreground">Latência</p>
          <p className="text-lg font-bold">{latency}ms</p>
        </div>
        <div className="p-3 rounded bg-muted">
          <p className="text-xs text-muted-foreground">Perda de Pacotes</p>
          <p className={cn('text-lg font-bold', packetLoss > 1 ? 'text-red-500' : '')}>{packetLoss.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}

export default NetworkMonitor;
