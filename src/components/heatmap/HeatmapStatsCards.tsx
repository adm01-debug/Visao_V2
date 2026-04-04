/**
 * VISÃO - Heatmap Stats Cards
 */
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Users, MapPin, TrendingUp } from 'lucide-react';

interface HeatmapStatsCardsProps {
  totalEvents: number;
  totalDetections: number;
  activeZones: number;
  hotZoneName: string;
}

export function HeatmapStatsCards({ totalEvents, totalDetections, activeZones, hotZoneName }: HeatmapStatsCardsProps) {
  const cards = [
    { icon: Activity, color: 'bg-primary/10 text-primary', label: 'Eventos Totais', value: totalEvents },
    { icon: Users, color: 'bg-blue-500/10 text-blue-500', label: 'Detecções', value: totalDetections },
    { icon: MapPin, color: 'bg-orange-500/10 text-orange-500', label: 'Zonas Ativas', value: activeZones },
    { icon: TrendingUp, color: 'bg-red-500/10 text-red-500', label: 'Zona Mais Ativa', value: hotZoneName || '-' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${c.color.split(' ')[0]}`}>
                <c.icon className={`h-5 w-5 ${c.color.split(' ')[1]}`} />
              </div>
              <div>
                <p className="text-2xl font-bold truncate">{c.value}</p>
                <p className="text-sm text-muted-foreground">{c.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
