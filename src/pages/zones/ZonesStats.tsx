import { Target, Activity, AlertTriangle, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StatsProps {
  total: number;
  active: number;
  restricted: number;
  counting: number;
  loading: boolean;
}

export function ZonesStats({ total, active, restricted, counting, loading }: StatsProps) {
  const statsConfig = [
    {
      label: 'Total',
      value: total,
      icon: Target,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
    },
    {
      label: 'Ativas',
      value: active,
      icon: Activity,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/20',
    },
    {
      label: 'Restritas',
      value: restricted,
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive/20',
    },
    {
      label: 'Contagem',
      value: counting,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statsConfig.map((stat, i) => (
        <Card key={i} className="border-border/40 bg-card/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full ${stat.bgColor} border ${stat.borderColor} flex items-center justify-center`}
              >
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${stat.color} tabular-nums`}>
                  {loading ? '—' : stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
