import { Bell, EyeOff, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AlertStats {
  total: number;
  unread: number;
  critical: number;
  today: number;
}

type StatsFilterKey = 'total' | 'unread' | 'critical' | 'today';

interface AlertStatsCardsProps {
  stats: AlertStats;
  activeFilter?: StatsFilterKey | null;
  onFilterClick?: (key: StatsFilterKey) => void;
}

const items = [
  { key: 'total' as const, label: 'Total', Icon: Bell, color: '', activeRing: 'ring-foreground/30' },
  { key: 'unread' as const, label: 'Não Lidos', Icon: EyeOff, color: 'text-primary', activeRing: 'ring-primary' },
  { key: 'critical' as const, label: 'Críticos', Icon: AlertTriangle, color: 'text-destructive', activeRing: 'ring-destructive' },
  { key: 'today' as const, label: 'Hoje', Icon: Clock, color: '', activeRing: 'ring-foreground/30' },
];

export function AlertStatsCards({ stats, activeFilter, onFilterClick }: AlertStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {items.map(({ key, label, Icon, color, activeRing }) => {
        const isActive = activeFilter === key;
        return (
          <Card
            key={key}
            className={cn(
              'transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.01]',
              isActive && `ring-2 ring-offset-2 ring-offset-background ${activeRing} scale-[1.02]`
            )}
            onClick={() => onFilterClick?.(key)}
          >
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
        );
      })}
    </div>
  );
}
