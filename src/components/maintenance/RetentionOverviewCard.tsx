import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Hourglass, Trash2 } from 'lucide-react';
import type { RetentionOverviewRow } from '@/hooks/useMaintenanceConsole';
import {
  evaluateRetentionDebut,
  formatDebutCountdown,
  type RetentionDebutView,
} from '@/lib/retention/retentionDebut';

interface RetentionOverviewCardProps {
  readonly rows: readonly RetentionOverviewRow[];
  readonly isLoading: boolean;
  /** Relógio de referência; injetável para teste determinístico. */
  readonly nowMs?: number;
}

const HEALTH_LABEL: Record<string, string> = {
  ok: 'em dia',
  warn: 'atrasada',
  stalled: 'parada',
  pending_first_run: 'estreia pendente',
  never: 'nunca executou',
};

function healthVariant(health: string): 'secondary' | 'destructive' | 'outline' {
  if (health === 'ok') return 'secondary';
  if (health === 'warn' || health === 'pending_first_run') return 'outline';
  return 'destructive';
}

/**
 * Onda 245 — a coluna "Última execução" precisa dizer a verdade sobre uma
 * rotina que nunca executou: sem estreia visível, "—" e "nunca executou"
 * descreviam igualmente a rotina nascida há dez minutos e a rotina quebrada
 * há semanas.
 */
function lastRunLabel(row: RetentionOverviewRow, view: RetentionDebutView): string {
  if (row.hours_since_last !== null) return `há ${Number(row.hours_since_last).toFixed(1)} h`;
  if (view.stage === 'pending') return formatDebutCountdown(view) ?? 'estreia pendente';
  if (view.stage === 'overdue') return 'nunca executou';
  return '—';
}

/** Onda 136/245 — supervisão humana das rotinas de expurgo. */
export function RetentionOverviewCard({ rows, isLoading, nowMs }: RetentionOverviewCardProps) {
  const clock = nowMs ?? Date.now();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-primary" aria-hidden="true" />
          Rotinas de expurgo
        </CardTitle>
        <CardDescription>
          Apagamento programado de dados pessoais. Rotina parada é risco de conformidade, não apenas
          acúmulo de disco. Rotina recém-registrada mostra o tempo restante até a primeira execução
          esperada, em vez de ser acusada de estar quebrada.
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
                Situação das rotinas de expurgo por cadência, estreia e última execução
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
                {rows.map((row) => {
                  // A régua recalcula a saúde a partir dos fatos crus; a coluna
                  // `health` do banco entra apenas como corroboração (Lei U9).
                  const view = evaluateRetentionDebut(
                    {
                      cadenceMinutes: row.cadence_minutes,
                      lastRun: row.last_run,
                      registeredAt: row.registered_at,
                      reportedHealth: row.health,
                    },
                    clock,
                  );
                  const health = view.stage === 'unknown' ? row.health : view.health;

                  return (
                    <tr key={row.job_name} className="border-b border-border/50">
                      <td className="py-2 pr-4">{row.label}</td>
                      <td className="py-2 pr-4">
                        <span className="flex items-center gap-1.5">
                          <Badge variant={healthVariant(health)}>
                            {view.stage === 'pending' ? (
                              <Hourglass className="mr-1 h-3 w-3" aria-hidden="true" />
                            ) : null}
                            {HEALTH_LABEL[health] ?? health}
                          </Badge>
                          {view.mismatch ? (
                            <AlertTriangle
                              className="h-3.5 w-3.5 text-muted-foreground"
                              aria-label="Painel e banco discordam sobre esta rotina"
                            />
                          ) : null}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">{row.cadence_minutes} min</td>
                      <td className="py-2 pr-4 text-muted-foreground">{lastRunLabel(row, view)}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{row.runs_last_30d}</td>
                      <td className="py-2 text-muted-foreground">{row.deleted_last_30d}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
