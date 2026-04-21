import { Bell, EyeOff, AlertTriangle, Clock } from 'lucide-react';
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
  loading?: boolean;
}

const items = [
  {
    key: 'total' as const,
    label: 'Total',
    Icon: Bell,
    iconBg: 'bg-secondary',
    iconColor: 'text-muted-foreground',
    valueColor: '',
    activeRing: 'ring-foreground/20',
  },
  {
    key: 'unread' as const,
    label: 'Não Lidos',
    Icon: EyeOff,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    valueColor: 'text-primary',
    activeRing: 'ring-primary',
  },
  {
    key: 'critical' as const,
    label: 'Críticos',
    Icon: AlertTriangle,
    iconBg: 'bg-severity-critical/10',
    iconColor: 'text-severity-critical',
    valueColor: 'text-severity-critical',
    activeRing: 'ring-severity-critical/50',
  },
  {
    key: 'today' as const,
    label: 'Hoje',
    Icon: Clock,
    iconBg: 'bg-secondary',
    iconColor: 'text-muted-foreground',
    valueColor: '',
    activeRing: 'ring-foreground/20',
  },
];

export function AlertStatsCards({ stats, activeFilter, onFilterClick, loading = false }: AlertStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map(({ key, label, Icon, iconBg, iconColor, valueColor, activeRing }) => {
        const isActive = activeFilter === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onFilterClick?.(key)}
            disabled={loading}
            className={cn(
              'relative flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card text-left w-full',
              'transition-all duration-200 hover:bg-accent/5 hover:shadow-sm hover:-translate-y-0.5',
              isActive && `ring-2 ring-offset-1 ring-offset-background ${activeRing}`,
              loading && 'opacity-70 cursor-wait',
            )}
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className={cn('flex items-center justify-center w-10 h-10 rounded-xl shrink-0', iconBg)}>
              <Icon className={cn('w-5 h-5', iconColor)} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
              <p className={cn('text-2xl font-bold tabular-nums leading-tight font-mono', valueColor)}>
                {loading ? '—' : stats[key]}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
