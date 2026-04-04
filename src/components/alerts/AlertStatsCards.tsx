import { Bell, EyeOff, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface AlertStats {
  total: number;
  unread: number;
  critical: number;
  today: number;
}

const items = [
  { key: 'total' as const, label: 'Total', Icon: Bell, color: '' },
  { key: 'unread' as const, label: 'Não Lidos', Icon: EyeOff, color: 'text-primary' },
  { key: 'critical' as const, label: 'Críticos', Icon: AlertTriangle, color: 'text-red-500' },
  { key: 'today' as const, label: 'Hoje', Icon: Clock, color: '' },
];

export function AlertStatsCards({ stats }: { stats: AlertStats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {items.map(({ key, label, Icon, color }) => (
        <Card key={key}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{stats[key]}</p>
              </div>
              <Icon className={`w-8 h-8 ${color || 'text-muted-foreground'}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
