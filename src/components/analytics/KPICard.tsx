import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface KPIData {
  label: string;
  value: number;
  previousValue: number;
  unit?: string;
  icon: React.ElementType;
  variant?: 'destructive' | 'primary' | 'success' | 'warning';
  /** @deprecated Use variant instead */
  color?: string;
}

const variantClasses: Record<string, string> = {
  destructive: 'bg-destructive/10 text-destructive',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
};

// Legacy color map for backwards compat
const colorToVariant: Record<string, string> = {
  'bg-destructive': 'destructive',
  'bg-primary': 'primary',
  'bg-success': 'success',
  'bg-warning': 'warning',
};

export function KPICard({ data, loading }: { data: KPIData; loading?: boolean }) {
  if (loading) {
    return (
      <div
        className="rounded-xl border border-border/50 bg-card p-5"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <Skeleton className="h-3 w-24 mb-3" />
        <Skeleton className="h-8 w-16 mb-3" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }

  const change =
    data.previousValue > 0 ? ((data.value - data.previousValue) / data.previousValue) * 100 : 0;
  const isPositive = change > 0;
  const isNeutral = change === 0;
  const Icon = data.icon;
  const resolvedVariant = data.variant || colorToVariant[data.color || ''] || 'primary';
  const iconClasses = variantClasses[resolvedVariant] || variantClasses.primary;

  return (
    <div
      className="rounded-xl border border-border/50 bg-card p-5 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 hover:border-primary/20 group"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {data.label}
        </span>
        <div
          className={cn('p-2 rounded-xl transition-transform group-hover:scale-105', iconClasses)}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold font-mono tabular-nums text-foreground">
          {data.value.toLocaleString('pt-BR')}
        </span>
        {data.unit && <span className="text-sm text-muted-foreground">{data.unit}</span>}
      </div>
      <div className="flex items-center gap-1.5 mt-3">
        {isNeutral ? (
          <>
            <Minus className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Sem alteração</span>
          </>
        ) : (
          <>
            <span
              className={cn(
                'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium',
                isPositive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
              )}
            >
              {isPositive ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {isPositive ? '+' : ''}
              {change.toFixed(1)}%
            </span>
            <span className="text-[11px] text-muted-foreground">vs anterior</span>
          </>
        )}
      </div>
    </div>
  );
}
