import React from 'react';
import { cn } from '@/lib/utils';
import { Camera, Video, WifiOff, AlertTriangle } from 'lucide-react';

interface CameraSummaryProps {
  total: number;
  online: number;
  recording: number;
  offline: number;
  alerts: number;
  className?: string;
}

export function CameraSummary({ total, online, recording, offline, alerts, className }: CameraSummaryProps) {
  return (
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Camera className="h-5 w-5 text-primary" />
        <span className="font-medium">Resumo de Câmeras</span>
        <span className="ml-auto text-2xl font-bold">{total}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 p-2 rounded bg-green-50">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-sm">Online</span>
          <span className="ml-auto font-bold">{online}</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded bg-blue-50">
          <Video className="h-4 w-4 text-blue-500" />
          <span className="text-sm">Gravando</span>
          <span className="ml-auto font-bold">{recording}</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded bg-gray-100">
          <WifiOff className="h-4 w-4 text-gray-500" />
          <span className="text-sm">Offline</span>
          <span className="ml-auto font-bold">{offline}</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <span className="text-sm">Alertas</span>
          <span className="ml-auto font-bold">{alerts}</span>
        </div>
      </div>
    </div>
  );
}

export default CameraSummary;
