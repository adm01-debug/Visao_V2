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
      {cards.map(({ icon: Icon, value, label, color }, idx) => (
        <Card
          key={label}
          className="group relative overflow-hidden animate-card-enter transition-all duration-300 ease-out hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 hover:border-primary/20 active:scale-[0.98] motion-reduce:transform-none motion-reduce:animate-none motion-reduce:transition-none"
          style={{ animationDelay: `${idx * 60}ms` }}
        >
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300 motion-reduce:hidden">
            <span className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-primary/10 to-transparent group-hover:animate-sheen" />
          </span>
          <CardContent className="relative z-10 pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${color.split(' ')[0]} transition-transform duration-300 group-hover:scale-110 motion-reduce:transform-none`}>
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
