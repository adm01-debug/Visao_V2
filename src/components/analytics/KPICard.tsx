import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface KPIData {
  label: string;
  value: number;
  previousValue: number;
  unit?: string;
  icon: React.ElementType;
  color: string;
}

export function KPICard({ data, loading }: { data: KPIData; loading?: boolean }) {
  if (loading) {
    return <Card><CardContent className="p-6"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-8 w-16 mb-2" /><Skeleton className="h-3 w-20" /></CardContent></Card>;
  }

  const change = data.previousValue > 0 ? ((data.value - data.previousValue) / data.previousValue) * 100 : 0;
  const isPositive = change > 0;
  const isNeutral = change === 0;
  const Icon = data.icon;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{data.label}</span>
          <div className={cn('p-2 rounded-lg', data.color)}><Icon className="w-4 h-4 text-white" /></div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{data.value.toLocaleString('pt-BR')}</span>
          {data.unit && <span className="text-sm text-muted-foreground">{data.unit}</span>}
        </div>
        <div className="flex items-center gap-1 mt-2">
          {isNeutral ? (
            <><Minus className="w-3 h-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">Sem alteração</span></>
          ) : (
            <>
              {isPositive ? <ArrowUpRight className="w-3 h-3 text-green-500" /> : <ArrowDownRight className="w-3 h-3 text-red-500" />}
              <span className={cn('text-xs font-medium', isPositive ? 'text-green-500' : 'text-red-500')}>{isPositive ? '+' : ''}{change.toFixed(1)}%</span>
              <span className="text-xs text-muted-foreground">vs período anterior</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
