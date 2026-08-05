import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import type { JourneyEntry } from './useJourneyData';

interface ZoneBreakdownProps {
  data: JourneyEntry[];
  formatMinutes: (min: number) => string;
}

export function ZoneBreakdown({ data, formatMinutes }: ZoneBreakdownProps) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Tempo por Zona
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.slice(0, 6).map((j) => (
            <div key={j.personId} className="p-4 rounded-lg border border-border/50 bg-muted/20">
              <p className="font-medium text-sm mb-3">{j.personName}</p>
              <div className="space-y-2">
                {j.zoneBreakdown.map((z, i) => {
                  const pct =
                    j.totalMinutes > 0 ? Math.round((z.minutes / j.totalMinutes) * 100) : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{z.zoneName}</span>
                        <span className="font-mono">{formatMinutes(z.minutes)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${z.type === 'productive' ? 'bg-success' : 'bg-warning'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
