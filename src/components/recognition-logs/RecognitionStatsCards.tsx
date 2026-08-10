import { Card, CardContent } from '@/components/ui/card';
import { Clock, CheckCircle, AlertTriangle, Percent } from 'lucide-react';

interface StatsCardsProps {
  total: number;
  recognized: number;
  unknown: number;
  avgConfidence: number;
}

const STAT_ITEMS = [
  {
    key: 'total',
    label: 'Total',
    icon: Clock,
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
  },
  {
    key: 'recognized',
    label: 'Reconhecidos',
    icon: CheckCircle,
    colorClass: 'text-success',
    bgClass: 'bg-success/10',
  },
  {
    key: 'unknown',
    label: 'Desconhecidos',
    icon: AlertTriangle,
    colorClass: 'text-warning',
    bgClass: 'bg-warning/10',
  },
  {
    key: 'avgConfidence',
    label: 'Confiança Média',
    icon: Percent,
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
    isPercent: true,
  },
] as const;

export function RecognitionStatsCards({
  total,
  recognized,
  unknown,
  avgConfidence,
}: StatsCardsProps) {
  const values: Record<string, number> = { total, recognized, unknown, avgConfidence };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {STAT_ITEMS.map((item) => {
        const Icon = item.icon;
        const val = values[item.key] ?? 0;
        return (
          <Card key={item.key}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${item.bgClass}`}>
                  <Icon className={`h-5 w-5 ${item.colorClass}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className={`text-2xl font-bold ${item.colorClass}`}>
                    {'isPercent' in item && item.isPercent ? `${val.toFixed(1)}%` : val}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
