import { Card, CardContent } from '@/components/ui/card';
import { Car, TrendingUp, Activity, AlertTriangle, CheckCircle2, BarChart3 } from 'lucide-react';

interface ALPRStats {
  totalDetections: number;
  todayDetections: number;
  uniquePlates: number;
  blacklistAlerts: number;
  authorizedRate: number;
  avgConfidence: number;
}

interface ALPRStatsCardsProps {
  stats: ALPRStats;
}

export function ALPRStatsCards({ stats }: ALPRStatsCardsProps) {
  const cards = [
    { icon: Car, value: stats.totalDetections, label: 'Total Detectado', color: 'bg-primary/10 text-primary' },
    { icon: TrendingUp, value: stats.todayDetections, label: 'Hoje', color: 'bg-success/10 text-success' },
    { icon: Activity, value: stats.uniquePlates, label: 'Veículos Únicos', color: 'bg-primary/10 text-primary' },
    { icon: AlertTriangle, value: stats.blacklistAlerts, label: 'Alertas Blacklist', color: 'bg-destructive/10 text-destructive' },
    { icon: CheckCircle2, value: `${stats.authorizedRate.toFixed(0)}%`, label: 'Taxa Autorização', color: 'bg-success/10 text-success' },
    { icon: BarChart3, value: `${stats.avgConfidence.toFixed(0)}%`, label: 'Confiança Média', color: 'bg-accent/50 text-accent-foreground' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map(({ icon: Icon, value, label, color }) => (
        <Card key={label}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${color.split(' ')[0]}`}>
                <Icon className={`h-5 w-5 ${color.split(' ')[1]}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
