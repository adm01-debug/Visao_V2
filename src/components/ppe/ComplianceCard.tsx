import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComplianceCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'stable';
  color?: 'default' | 'success' | 'warning' | 'danger';
}

const colorClasses = {
  default: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
};

export function ComplianceCard({ title, value, icon: Icon, trend, color = 'default' }: ComplianceCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn("text-2xl font-bold", colorClasses[color])}>{value}</p>
          </div>
          <div className={cn("p-3 rounded-full bg-muted", colorClasses[color])}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        {trend && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className={cn("w-3 h-3", trend === 'up' ? 'text-green-500' : 'text-red-500 rotate-180')} />
            <span>{trend === 'up' ? 'Melhoria' : 'Queda'} vs. ontem</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
