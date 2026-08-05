import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DataCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  className?: string;
  index?: number;
}

export function DataCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
  index = 0,
}: DataCardProps) {
  return (
    <Card
      className={cn(
        'group relative overflow-hidden animate-card-enter',
        'transition-all duration-300 ease-out',
        'hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 hover:border-primary/20',
        'active:scale-[0.98]',
        'motion-reduce:transform-none motion-reduce:animate-none motion-reduce:transition-none',
        className
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 -z-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300',
          'motion-reduce:hidden'
        )}
      >
        <span className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-primary/10 to-transparent group-hover:animate-sheen" />
      </span>

      <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        {trend && (
          <p className={cn('text-xs mt-1', trend.isPositive ? 'text-success' : 'text-destructive')}>
            {trend.isPositive ? '+' : ''}
            {trend.value}%
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default DataCard;
