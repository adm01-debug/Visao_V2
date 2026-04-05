import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Users } from 'lucide-react';
import type { JourneyEntry } from './useJourneyData';

interface JourneyTableProps {
  data: JourneyEntry[];
  isLoading: boolean;
  formatMinutes: (min: number) => string;
}

function PunctualityBadge({ p }: { p: JourneyEntry['punctuality'] }) {
  switch (p) {
    case 'on_time': return <Badge className="bg-success/15 text-success border-success/30 text-[10px]">✅ Pontual</Badge>;
    case 'late': return <Badge className="bg-warning/15 text-warning border-warning/30 text-[10px]">⚠️ Atraso</Badge>;
    case 'very_late': return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">🔴 Muito Atrasado</Badge>;
    case 'absent': return <Badge className="bg-muted text-muted-foreground text-[10px]">❌ Ausente</Badge>;
  }
}

export function JourneyTable({ data, isLoading, formatMinutes }: JourneyTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" />Jornada por Colaborador</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : data.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum dado de jornada encontrado</p>
            <p className="text-sm mt-1">Cadastre colaboradores e configure zonas para monitoramento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Colaborador</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Dept.</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Entrada</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Saída</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Produtivo</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Ocioso</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Pausas</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Pontualidade</th>
                </tr>
              </thead>
              <tbody>
                {data.map((j) => (
                  <tr key={j.personId} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-medium">{j.personName}</td>
                    <td className="p-3 text-xs text-muted-foreground">{j.department || '-'}</td>
                    <td className="p-3 text-center font-mono text-xs">{j.firstSeen}</td>
                    <td className="p-3 text-center font-mono text-xs">{j.lastSeen}</td>
                    <td className="p-3 text-right font-mono font-bold tabular-nums">{formatMinutes(j.totalMinutes)}</td>
                    <td className="p-3 text-right font-mono text-xs text-emerald-600 tabular-nums">{formatMinutes(j.productiveMinutes)}</td>
                    <td className="p-3 text-right font-mono text-xs text-yellow-600 tabular-nums">{formatMinutes(j.idleMinutes)}</td>
                    <td className="p-3 text-center font-mono text-xs">{j.breakCount}</td>
                    <td className="p-3 text-center"><PunctualityBadge p={j.punctuality} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
