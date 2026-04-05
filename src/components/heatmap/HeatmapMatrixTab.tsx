/**
 * VISÃO - Heatmap Matrix Tab
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MapPin, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ZoneActivity {
  id: string;
  name: string;
  total: number;
  hourly: { hour: number; count: number; intensity: number }[];
  peak: { hour: number; count: number };
  trend: 'up' | 'down' | 'stable';
}

const getHeatClass = (intensity: number): string => {
  if (intensity >= 0.9) return 'bg-destructive/80';
  if (intensity >= 0.7) return 'bg-warning/70';
  if (intensity >= 0.5) return 'bg-warning/60';
  if (intensity >= 0.3) return 'bg-success/50';
  if (intensity >= 0.1) return 'bg-primary/40';
  return 'bg-primary/30';
};

interface HeatmapMatrixTabProps {
  zoneActivities: ZoneActivity[];
  loading: boolean;
}

export function HeatmapMatrixTab({ zoneActivities, loading }: HeatmapMatrixTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Atividade por Hora</CardTitle>
        <CardDescription>Intensidade de movimentação em cada zona ao longo do dia</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : zoneActivities.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground"><MapPin className="h-12 w-12 mx-auto mb-4 opacity-30" /><p>Nenhuma zona configurada</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><th className="text-left p-2 font-medium">Zona</th>
                {Array.from({ length: 24 }, (_, i) => <th key={i} className="p-1 text-center text-xs text-muted-foreground">{i.toString().padStart(2, '0')}</th>)}
              </tr></thead>
              <tbody>{zoneActivities.map(zone => (
                <tr key={zone.id}><td className="p-2 font-medium whitespace-nowrap">{zone.name}</td>
                  {zone.hourly.map((h, idx) => (
                    <td key={idx} className="p-0.5">
                      <div className={cn('w-6 h-6 rounded-sm transition-all hover:scale-125', getHeatClass(h.intensity))}
                        title={`${zone.name} - ${h.hour}h: ${h.count} eventos`} />
                    </td>
                  ))}
                </tr>
              ))}</tbody>
            </table>
            <div className="flex items-center justify-center gap-4 mt-6">
              <span className="text-sm text-muted-foreground">Menor</span>
              <div className="flex gap-1">
                {['bg-primary/30', 'bg-primary/40', 'bg-success/50', 'bg-warning/60', 'bg-warning/70', 'bg-destructive/80'].map(c => (
                  <div key={c} className={`w-6 h-4 rounded ${c}`} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">Maior</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { getHeatClass };
export type { ZoneActivity };
