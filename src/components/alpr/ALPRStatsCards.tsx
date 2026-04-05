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
    { icon: TrendingUp, value: stats.todayDetections, label: 'Hoje', color: 'bg-green-500/10 text-green-500' },
    { icon: Activity, value: stats.uniquePlates, label: 'Veículos Únicos', color: 'bg-blue-500/10 text-blue-500' },
    { icon: AlertTriangle, value: stats.blacklistAlerts, label: 'Alertas Blacklist', color: 'bg-destructive/10 text-destructive' },
    { icon: CheckCircle2, value: `${stats.authorizedRate.toFixed(0)}%`, label: 'Taxa Autorização', color: 'bg-green-500/10 text-green-500' },
    { icon: BarChart3, value: `${stats.avgConfidence.toFixed(0)}%`, label: 'Confiança Média', color: 'bg-purple-500/10 text-purple-500' },
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
