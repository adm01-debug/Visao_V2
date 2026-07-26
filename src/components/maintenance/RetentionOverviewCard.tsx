import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2 } from 'lucide-react';
import type { RetentionOverviewRow } from '@/hooks/useMaintenanceConsole';

interface RetentionOverviewCardProps {
  readonly rows: readonly RetentionOverviewRow[];
  readonly isLoading: boolean;
}

const HEALTH_LABEL: Record<string, string> = {
  ok: 'em dia',
  warn: 'atrasada',
  stalled: 'parada',
  never: 'nunca executou',
};

function healthVariant(health: string): 'secondary' | 'destructive' | 'outline' {
  if (health === 'ok') return 'secondary';
  if (health === 'warn') return 'outline';
  return 'destructive';
}

/** Onda 136 — supervisão humana das rotinas de expurgo (Ondas 134/135). */
export function RetentionOverviewCard({ rows, isLoading }: RetentionOverviewCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-primary" aria-hidden="true" />
          Rotinas de expurgo
        </CardTitle>
        <CardDescription>
          Apagamento programado de dados pessoais. Rotina parada é risco de conformidade, não apenas
          acúmulo de disco.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma rotina registrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Situação das rotinas de expurgo por cadência e última execução
              </caption>
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th scope="col" className="py-2 pr-4 font-medium">Rotina</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Situação</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Cadência</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Última execução</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Execuções 30d</th>
                  <th scope="col" className="py-2 font-medium">Apagados 30d</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.job_name} className="border-b border-border/50">
                    <td className="py-2 pr-4">{row.label}</td>
                    <td className="py-2 pr-4">
                      <Badge variant={healthVariant(row.health)}>
                        {HEALTH_LABEL[row.health] ?? row.health}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{row.cadence_minutes} min</td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {row.hours_since_last === null
                        ? '—'
                        : `há ${Number(row.hours_since_last).toFixed(1)} h`}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{row.runs_last_30d}</td>
                    <td className="py-2 text-muted-foreground">{row.deleted_last_30d}</td>
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
