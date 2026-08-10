import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  className?: string;
  index?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  className,
  index = 0,
}) => (
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
    {/* Sheen overlay on hover */}
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 -z-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300',
        'motion-reduce:hidden'
      )}
    >
      <span className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-primary/10 to-transparent group-hover:animate-sheen" />
    </span>

    <CardContent className="relative z-10 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {trend && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs mt-2',
                trend.value >= 0 ? 'text-success' : 'text-destructive'
              )}
            >
              {trend.value >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>
                {Math.abs(trend.value)}% {trend.label}
              </span>
            </div>
          )}
        </div>
        <div className="p-3 bg-primary/10 rounded-lg transition-all duration-300 group-hover:bg-primary/15 group-hover:scale-110 motion-reduce:transform-none">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default StatCard;
