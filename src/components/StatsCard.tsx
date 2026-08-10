import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { useMemo, useEffect, useState, useRef } from 'react';

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
  index?: number;
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

const glowVariantStyles = {
  default: 'hover:shadow-[var(--shadow-card-glow)]',
  primary: 'hover:shadow-[var(--shadow-card-glow)]',
  success: 'hover:shadow-[0_8px_32px_hsl(var(--success)/0.12),0_0_0_1px_hsl(var(--success)/0.08)]',
  warning: 'hover:shadow-[0_8px_32px_hsl(var(--warning)/0.12),0_0_0_1px_hsl(var(--warning)/0.08)]',
  danger:
    'hover:shadow-[0_8px_32px_hsl(var(--destructive)/0.12),0_0_0_1px_hsl(var(--destructive)/0.08)]',
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
    <svg
      width="80"
      height="32"
      viewBox="0 0 80 32"
      className="opacity-40 group-hover:opacity-70 transition-opacity duration-500"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`sg-${color.replace(/[^a-z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#sg-${color.replace(/[^a-z0-9]/g, '')})`} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function useAnimatedNumber(value: string | number): string {
  const original = String(value);

  // Parse the animatable number from the value
  const { targetNum, formatFn } = useMemo(() => {
    if (typeof value === 'number') {
      return { targetNum: value, formatFn: (n: number) => String(n) };
    }
    if (original.includes('/')) {
      const parts = original.split('/');
      return { targetNum: parseInt(parts[0]!) || 0, formatFn: (n: number) => `${n}/${parts[1]}` };
    }
    if (original.includes('%')) {
      return { targetNum: parseInt(original) || 0, formatFn: (n: number) => `${n}%` };
    }
    const parsed = parseInt(original);
    if (isNaN(parsed) || parsed <= 0) {
      return { targetNum: 0, formatFn: () => original };
    }
    return { targetNum: parsed, formatFn: (n: number) => String(n) };
  }, [value, original]);

  const [displayValue, setDisplayValue] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (targetNum <= 0 || hasAnimated.current) {
      setDisplayValue(targetNum);
      return;
    }
    hasAnimated.current = true;
    const duration = 600;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(Math.round(targetNum * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [targetNum]);

  if (targetNum <= 0) return original;
  return formatFn(displayValue);
}

function useFakeSparkline(value: string | number): number[] {
  return useMemo(() => {
    const num = typeof value === 'number' ? value : parseInt(String(value)) || 50;
    return Array.from({ length: 8 }, (_, i) =>
      Math.max(0, num + Math.sin(i * 1.2) * (num * 0.15) + (i - 3) * (num * 0.03))
    );
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
  index = 0,
}: StatsCardProps) {
  const fakeData = useFakeSparkline(value);
  const data = sparklineData || fakeData;
  const animatedValue = useAnimatedNumber(value);
  const isTextValue = typeof value === 'string' && isNaN(Number(value.replace(/[^0-9]/g, '')));

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 sm:p-5 animate-card-enter',
        'transition-all duration-300 ease-out',
        'hover:border-border hover:-translate-y-1 active:scale-[0.98] active:translate-y-0',
        'motion-reduce:transform-none motion-reduce:animate-none motion-reduce:transition-none',
        glowVariantStyles[variant],
        'group'
      )}
      style={{ boxShadow: 'var(--shadow-card)', animationDelay: `${index * 60}ms` }}
      role="region"
      aria-label={`${title}: ${value}${subtitle ? `, ${subtitle}` : ''}${trend ? `, ${trend.isPositive ? 'subiu' : 'caiu'} ${Math.abs(trend.value)}%` : ''}`}
    >
      {/* Sheen overlay on hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300 motion-reduce:hidden"
      >
        <span className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-primary/10 to-transparent group-hover:animate-sheen" />
      </span>
      {/* Top accent line with glow on hover */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-[2px] transition-all duration-300',
          accentLine[variant]
        )}
      >
        <div
          className={cn(
            'absolute inset-0 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500',
            accentLine[variant]
          )}
        />
      </div>

      {/* Hover glow radial */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${sparklineColors[variant].replace(')', ' / 0.06)')}, transparent 70%)`,
        }}
      />

      {/* Sparkline background */}
      <div className="absolute bottom-0 right-0 transition-transform duration-500 group-hover:scale-110 origin-bottom-right">
        <MiniSparkline data={data} color={sparklineColors[variant]} />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-none">
            {title}
          </p>
          <div
            className={cn(
              'p-2 rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg',
              iconVariantStyles[variant]
            )}
            aria-hidden="true"
          >
            <Icon className="w-4 h-4" />
          </div>
        </div>

        <p
          className={cn(
            'font-bold font-mono tabular-nums leading-none text-foreground transition-transform duration-300 group-hover:translate-x-0.5',
            isTextValue ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'
          )}
        >
          {animatedValue}
        </p>

        <div className="flex items-center justify-between mt-2.5 gap-2">
          {subtitle && <p className="text-[11px] text-muted-foreground/70 truncate">{subtitle}</p>}
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 transition-transform duration-300 group-hover:scale-105',
                trend.isPositive
                  ? 'bg-success/10 text-success'
                  : 'bg-destructive/10 text-destructive'
              )}
            >
              <span aria-hidden="true">{trend.isPositive ? '↑' : '↓'}</span>
              {Math.abs(trend.value)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
