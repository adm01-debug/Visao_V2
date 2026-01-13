import React from 'react';
import { cn } from '@/lib/utils';
import { Cpu, HardDrive, Wifi, Battery, Thermometer } from 'lucide-react';

interface SystemMonitorProps { cpu: number; memory: number; disk: number; network?: number; battery?: number; temperature?: number; className?: string; }

export function SystemMonitor({ cpu, memory, disk, network, battery, temperature, className }: SystemMonitorProps) {
  const getColor = (v: number) => v < 50 ? 'text-green-500' : v < 80 ? 'text-yellow-500' : 'text-red-500';
  
  return (
    <div className={cn('p-4 rounded-xl border bg-card grid grid-cols-3 gap-4', className)}>
      <div className="text-center"><Cpu className={cn('h-6 w-6 mx-auto mb-1', getColor(cpu))} /><p className="text-2xl font-bold">{cpu}%</p><p className="text-xs text-muted-foreground">CPU</p></div>
      <div className="text-center"><HardDrive className={cn('h-6 w-6 mx-auto mb-1', getColor(memory))} /><p className="text-2xl font-bold">{memory}%</p><p className="text-xs text-muted-foreground">RAM</p></div>
      <div className="text-center"><HardDrive className={cn('h-6 w-6 mx-auto mb-1', getColor(disk))} /><p className="text-2xl font-bold">{disk}%</p><p className="text-xs text-muted-foreground">Disco</p></div>
      {network !== undefined && <div className="text-center"><Wifi className="h-6 w-6 mx-auto mb-1 text-blue-500" /><p className="text-2xl font-bold">{network}Mb</p><p className="text-xs text-muted-foreground">Rede</p></div>}
      {battery !== undefined && <div className="text-center"><Battery className={cn('h-6 w-6 mx-auto mb-1', battery < 20 ? 'text-red-500' : 'text-green-500')} /><p className="text-2xl font-bold">{battery}%</p><p className="text-xs text-muted-foreground">Bateria</p></div>}
      {temperature !== undefined && <div className="text-center"><Thermometer className={cn('h-6 w-6 mx-auto mb-1', temperature > 70 ? 'text-red-500' : 'text-blue-500')} /><p className="text-2xl font-bold">{temperature}°C</p><p className="text-xs text-muted-foreground">Temp</p></div>}
    </div>
  );
}

export default SystemMonitor;
