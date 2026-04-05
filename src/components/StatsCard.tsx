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
  primary: 'bg-primary/20 text-primary',
  success: 'bg-success/20 text-success',
  warning: 'bg-warning/20 text-warning',
  danger: 'bg-destructive/20 text-destructive',
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
    <svg width="80" height="24" viewBox="0 0 80 24" className="opacity-60" aria-hidden="true" role="presentation">
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
      className="glass-card p-5 transition-all duration-300 group hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 focus-within:border-primary/30 focus-within:shadow-lg"
      role="region"
      aria-label={`${title}: ${value}${subtitle ? `, ${subtitle}` : ''}${trend ? `, ${trend.isPositive ? 'subiu' : 'caiu'} ${Math.abs(trend.value)}%` : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className={cn("text-3xl font-bold font-mono tabular-nums", variantStyles[variant])}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 mt-2 text-xs font-medium",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              <span aria-hidden="true">{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground">vs ontem</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={cn("p-3 rounded-xl transition-transform duration-300 group-hover:scale-110", iconVariantStyles[variant])} aria-hidden="true">
            <Icon className="w-6 h-6" />
          </div>
          <MiniSparkline data={data} color={sparklineColors[variant]} />
        </div>
      </div>
    </div>
  );
}
