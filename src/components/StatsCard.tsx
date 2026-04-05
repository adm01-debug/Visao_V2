import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { useMemo } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  sparklineData?: number[];
}

const variantStyles = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
};

const iconVariantStyles = {
  default: 'bg-secondary text-muted-foreground',
  primary: 'bg-primary/12 text-primary',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/12 text-warning',
  danger: 'bg-destructive/12 text-destructive',
};

const sparklineColors = {
  default: 'hsl(var(--primary))',
  primary: 'hsl(var(--primary))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  danger: 'hsl(var(--destructive))',
};

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const path = useMemo(() => {
    if (data.length < 2) return '';
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const w = 80;
    const h = 24;
    const step = w / (data.length - 1);
    return data.map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * h;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');
  }, [data]);

  if (data.length < 2) return null;

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="opacity-40" aria-hidden="true" role="presentation">
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function useFakeSparkline(value: string | number): number[] {
  return useMemo(() => {
    const num = typeof value === 'number' ? value : parseInt(String(value)) || 50;
    return Array.from({ length: 7 }, (_, i) => Math.max(0, num + Math.sin(i * 1.2) * (num * 0.15) + (i - 3) * (num * 0.03)));
  }, [value]);
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  sparklineData,
}: StatsCardProps) {
  const fakeData = useFakeSparkline(value);
  const data = sparklineData || fakeData;

  return (
    <div
      className={cn(
        'relative rounded-lg border bg-card p-5 transition-all duration-200',
        'hover:border-border/80 hover:shadow-sm hover:-translate-y-0.5',
        'group'
      )}
      style={{ boxShadow: 'var(--shadow-card)' }}
      role="region"
      aria-label={`${title}: ${value}${subtitle ? `, ${subtitle}` : ''}${trend ? `, ${trend.isPositive ? 'subiu' : 'caiu'} ${Math.abs(trend.value)}%` : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">{title}</p>
          <p className={cn("text-3xl font-bold font-mono tabular-nums leading-none", variantStyles[variant])}>
            {value}
          </p>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground mt-1.5">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 mt-2.5 text-xs font-medium",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              <span aria-hidden="true">{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground font-normal">vs ontem</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2.5">
          <div className={cn("p-2.5 rounded-lg transition-transform duration-200 group-hover:scale-105", iconVariantStyles[variant])} aria-hidden="true">
            <Icon className="w-5 h-5" />
          </div>
          <MiniSparkline data={data} color={sparklineColors[variant]} />
        </div>
      </div>
    </div>
  );
}
