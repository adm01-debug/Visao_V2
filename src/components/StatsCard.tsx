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

const iconVariantStyles = {
  default: 'bg-primary/10 text-primary',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-destructive/10 text-destructive',
};

const accentLine = {
  default: 'bg-primary/60',
  primary: 'bg-primary/60',
  success: 'bg-success/60',
  warning: 'bg-warning/60',
  danger: 'bg-destructive/60',
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
    const w = 80;
    const h = 32;
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
    <svg width="80" height="32" viewBox="0 0 80 32" className="opacity-40 group-hover:opacity-60 transition-opacity" aria-hidden="true">
      <defs>
        <linearGradient id={`sg-${color.replace(/[^a-z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#sg-${color.replace(/[^a-z0-9]/g, '')})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function useFakeSparkline(value: string | number): number[] {
  return useMemo(() => {
    const num = typeof value === 'number' ? value : parseInt(String(value)) || 50;
    return Array.from({ length: 8 }, (_, i) => Math.max(0, num + Math.sin(i * 1.2) * (num * 0.15) + (i - 3) * (num * 0.03)));
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
  const isTextValue = typeof value === 'string' && isNaN(Number(value.replace(/[^0-9]/g, '')));

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 sm:p-5 transition-all duration-200',
        'hover:border-border hover:shadow-md hover:-translate-y-0.5',
        'group'
      )}
      style={{ boxShadow: 'var(--shadow-card)' }}
      role="region"
      aria-label={`${title}: ${value}${subtitle ? `, ${subtitle}` : ''}${trend ? `, ${trend.isPositive ? 'subiu' : 'caiu'} ${Math.abs(trend.value)}%` : ''}`}
    >
      {/* Top accent line */}
      <div className={cn('absolute top-0 left-0 right-0 h-[2px]', accentLine[variant])} />

      {/* Sparkline background */}
      <div className="absolute bottom-0 right-0">
        <MiniSparkline data={data} color={sparklineColors[variant]} />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-none">{title}</p>
          <div className={cn(
            "p-2 rounded-lg transition-transform duration-200 group-hover:scale-105",
            iconVariantStyles[variant]
          )} aria-hidden="true">
            <Icon className="w-4 h-4" />
          </div>
        </div>

        <p className={cn(
          "font-bold font-mono tabular-nums leading-none text-foreground",
          isTextValue ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
        )}>
          {value}
        </p>

        <div className="flex items-center justify-between mt-2.5 gap-2">
          {subtitle && (
            <p className="text-[11px] text-muted-foreground/70 truncate">{subtitle}</p>
          )}
          {trend && (
            <span className={cn(
              "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0",
              trend.isPositive
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            )}>
              <span aria-hidden="true">{trend.isPositive ? '↑' : '↓'}</span>
              {Math.abs(trend.value)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
