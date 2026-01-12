import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; label?: string };
  icon?: React.ReactNode;
  color?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

const colorClasses = {
  default: 'border-l-primary',
  success: 'border-l-green-500',
  warning: 'border-l-yellow-500',
  danger: 'border-l-red-500',
};

export function KPICard({ title, value, subtitle, trend, icon, color = 'default', className }: KPICardProps) {
  const TrendIcon = trend ? (trend.value > 0 ? TrendingUp : trend.value < 0 ? TrendingDown : Minus) : null;
  const trendColor = trend ? (trend.value > 0 ? 'text-green-500' : trend.value < 0 ? 'text-red-500' : 'text-muted-foreground') : '';

  return (
    <div className={cn('p-4 rounded-lg border border-l-4 bg-card', colorClasses[color], className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      {trend && (
        <div className={cn('flex items-center gap-1 mt-2 text-sm', trendColor)}>
          {TrendIcon && <TrendIcon className="h-4 w-4" />}
          <span>{Math.abs(trend.value)}%</span>
          {trend.label && <span className="text-muted-foreground">{trend.label}</span>}
        </div>
      )}
    </div>
  );
}

export default KPICard;
