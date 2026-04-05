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
  default: '',
  primary: '',
  success: '',
  warning: '',
  danger: '',
};

const iconVariantStyles = {
  default: 'bg-primary/10 text-primary',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-destructive/10 text-destructive',
};

const sparklineColors = {
  default: 'hsl(var(--primary))',
  primary: 'hsl(var(--primary))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  danger: 'hsl(var(--destructive))',
};

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const { path, areaPath } = useMemo(() => {
    if (data.length < 2) return { path: '', areaPath: '' };
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const w = 72;
    const h = 28;
    const step = w / (data.length - 1);
    const points = data.map((v, i) => ({
      x: i * step,
      y: h - ((v - min) / range) * (h - 4) - 2,
    }));
    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const lastPt = points[points.length - 1];
    const firstPt = points[0];
    const area = lastPt && firstPt ? `${line} L${lastPt.x},${h} L${firstPt.x},${h} Z` : '';
    return { path: line, areaPath: area };
  }, [data]);

  if (data.length < 2) return null;

  return (
    <svg width="72" height="28" viewBox="0 0 72 28" className="mt-1" aria-hidden="true">
      <defs>
        <linearGradient id={`grad-${color.replace(/[^a-z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#grad-${color.replace(/[^a-z0-9]/g, '')})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
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
        'relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-all duration-200',
        'hover:border-border hover:shadow-md hover:-translate-y-0.5',
        'group'
      )}
      style={{ boxShadow: 'var(--shadow-card)' }}
      role="region"
      aria-label={`${title}: ${value}${subtitle ? `, ${subtitle}` : ''}${trend ? `, ${trend.isPositive ? 'subiu' : 'caiu'} ${Math.abs(trend.value)}%` : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 relative z-10">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">{title}</p>
          <p className={cn("text-3xl font-bold font-mono tabular-nums leading-none text-foreground", variantStyles[variant])}>
            {value}
          </p>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground/80 mt-1.5">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "inline-flex items-center gap-1 mt-3 px-2 py-0.5 rounded-full text-xs font-medium",
              trend.isPositive
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            )}>
              <span aria-hidden="true">{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 relative z-10">
          <div className={cn(
            "p-2.5 rounded-xl transition-transform duration-200 group-hover:scale-105",
            iconVariantStyles[variant]
          )} aria-hidden="true">
            <Icon className="w-5 h-5" />
          </div>
          <MiniSparkline data={data} color={sparklineColors[variant]} />
        </div>
      </div>
    </div>
  );
}
