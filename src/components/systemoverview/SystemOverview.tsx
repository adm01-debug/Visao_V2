import React from 'react';
import { cn } from '@/lib/utils';
import { Camera, AlertTriangle, HardDrive, Activity, Users, Video } from 'lucide-react';

interface SystemOverviewProps {
  cameras: { total: number; online: number; recording: number };
  alerts: { active: number; today: number };
  storage: { used: number; total: number };
  uptime: number;
  users: { online: number };
  className?: string;
}

export function SystemOverview({ cameras, alerts, storage, uptime, users, className }: SystemOverviewProps) {
  const items = [
    { icon: Camera, label: 'Câmeras Online', value: `${cameras.online}/${cameras.total}`, color: 'text-green-500' },
    { icon: Video, label: 'Gravando', value: cameras.recording, color: 'text-blue-500' },
    { icon: AlertTriangle, label: 'Alertas Ativos', value: alerts.active, color: alerts.active > 0 ? 'text-yellow-500' : 'text-green-500' },
    { icon: HardDrive, label: 'Armazenamento', value: `${Math.round(storage.used/storage.total*100)}%`, color: storage.used/storage.total > 0.9 ? 'text-red-500' : 'text-green-500' },
    { icon: Activity, label: 'Uptime', value: `${Math.floor(uptime/86400)}d`, color: 'text-green-500' },
    { icon: Users, label: 'Usuários Online', value: users.online, color: 'text-blue-500' },
  ];

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4', className)}>
      {items.map((item, i) => (
        <div key={i} className="p-4 rounded-lg border bg-card text-center">
          <item.icon className={cn('h-6 w-6 mx-auto mb-2', item.color)} />
          <p className="text-2xl font-bold">{item.value}</p>
          <p className="text-xs text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export default SystemOverview;
