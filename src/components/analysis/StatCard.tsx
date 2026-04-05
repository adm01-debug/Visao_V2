/**
 * VISÃO - Stat Card
 */
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatCard({ icon: Icon, label, value, trend, className }: StatCardProps) {
  return (
    <div className={cn('bg-card/50 rounded-lg p-3', className)}>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold">{value}</span>
        {trend && (
          <TrendingUp className={cn('w-4 h-4', trend === 'up' && 'text-success', trend === 'down' && 'text-destructive rotate-180', trend === 'neutral' && 'text-muted-foreground')} />
        )}
      </div>
    </div>
  );
}
