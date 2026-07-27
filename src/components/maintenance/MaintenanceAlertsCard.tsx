import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { MaintenanceConsoleModel } from '@/lib/maintenance/maintenanceConsoleView';
import { scopeLabel } from '@/lib/maintenance/maintenanceOwner';
import {
  applyOwnerFilter,
  buildOwnerBuckets,
  resolveOwnerFilter,
} from '@/lib/maintenance/ownerFilter';
import { agingLabel, buildOwnerAgingMap } from '@/lib/maintenance/ownerAging';

interface MaintenanceAlertsCardProps {
  readonly model: MaintenanceConsoleModel;
  readonly isLoading: boolean;
  readonly isAcknowledging: boolean;
  readonly pendingId: string | null;
  readonly onAcknowledge: (alertId: string) => void;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} d`;
}

/** Onda 136 — lista de incidentes de manutenção com reconhecimento humano. */
export function MaintenanceAlertsCard({
  model,
  isLoading,
  isAcknowledging,
  pendingId,
  onAcknowledge,
}: MaintenanceAlertsCardProps) {
  const { rows, summary } = model;

  // Onda 148 — recorte por responsável. O estado guarda apenas a chave crua;
  // o valor efetivo é DERIVADO dos baldes a cada render, então um balde que
  // some entre dois refetches degrada para `Todos` sem useEffect.
  const [selected, setSelected] = useState<string>('all');
  const buckets = useMemo(() => buildOwnerBuckets(rows), [rows]);
  const activeKey = resolveOwnerFilter(buckets, selected);
  const visibleRows = useMemo(() => applyOwnerFilter(rows, activeKey), [rows, activeKey]);
  // Onda 149 — dívida de atendimento por responsável, derivada das mesmas
  // linhas (a idade já vem do relógio único do console).
  const agingMap = useMemo(() => buildOwnerAgingMap(rows), [rows]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" aria-hidden="true" />
          Incidentes de manutenção
        </CardTitle>
        <CardDescription>
          Reconhecer congela o escalonamento e assume o incidente. A ação é definitiva: uma
          reincidência gera um alerta novo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>Nenhum incidente registrado</AlertTitle>
            <AlertDescription>
              As rotinas de manutenção não reportaram falhas até agora.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="flex flex-wrap gap-2" aria-live="polite">
              <Badge variant={summary.openCritical > 0 ? 'destructive' : 'secondary'}>
                {summary.openCritical} críticos abertos
              </Badge>
              <Badge variant="secondary">{summary.openWarning} avisos abertos</Badge>
              <Badge variant="outline">{summary.acknowledged} reconhecidos</Badge>
              {summary.atCeiling > 0 && (
                <Badge variant="destructive">{summary.atCeiling} no topo da escada</Badge>
              )}
            </div>

            {buckets.length > 1 && (
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Filtrar incidentes por responsável"
              >
                {buckets.map((bucket) => {
                  const isActive = bucket.key === activeKey;
                  const aging = agingMap.get(bucket.key);
                  const debt = aging ? agingLabel(aging) : null;
                  return (
                    <Button
                      key={bucket.key}
                      type="button"
                      size="sm"
                      variant={isActive ? 'default' : 'outline'}
                      aria-pressed={isActive}
                      className={cn(
                        'h-8 gap-2 rounded-full px-3 text-xs',
                        aging?.state === 'breached' && !isActive && 'border-destructive/60',
                      )}
                      onClick={() => setSelected(bucket.key)}
                      title={debt ?? undefined}
                    >
                      <span>{bucket.label}</span>
                      <span
                        className={cn(
                          'rounded-full px-1.5 text-[0.65rem] font-semibold',
                          bucket.critical > 0 || aging?.state === 'breached'
                            ? 'bg-destructive text-destructive-foreground'
                            : aging?.state === 'at_risk'
                              ? 'bg-warning text-warning-foreground'
                              : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {bucket.open}
                      </span>
                      {debt && <span className="sr-only">{debt}</span>}
                    </Button>
                  );
                })}
              </div>
            )}

            {visibleRows.length === 0 ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>Nada pendente para este responsável</AlertTitle>
                <AlertDescription>
                  Os incidentes deste recorte já foram reconhecidos.
                </AlertDescription>
              </Alert>
            ) : (
            <ul className="space-y-3">
              {visibleRows.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={row.severity === 'critical' ? 'destructive' : 'secondary'}>
                        {row.severity === 'critical' ? 'crítico' : 'aviso'}
                      </Badge>
                      <span className="truncate font-medium">{row.routine}</span>
                      <Badge variant="outline">{row.levelLabel}</Badge>
                      {row.routing && (
                        <Badge variant="outline" className="border-primary/40 text-primary">
                          {row.routing.label}
                        </Badge>
                      )}
                      {row.routing && scopeLabel(row.routing) && (
                        <Badge variant="outline" className="text-muted-foreground">
                          {scopeLabel(row.routing)}
                        </Badge>
                      )}
                      {row.status === 'acknowledged' && (
                        <Badge variant="outline" className="text-muted-foreground">
                          reconhecido
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{row.reason}</p>
                    {row.routing && (
                      <p className="text-xs font-medium text-foreground">{row.routing.action}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Aberto há {formatMinutes(row.ageMinutes)}
                      {row.minutesToNextLevel !== null
                        ? ` · próximo degrau em ${formatMinutes(row.minutesToNextLevel)}`
                        : row.status === 'open'
                          ? ' · escalonamento no teto'
                          : ''}
                    </p>
                  </div>

                  {row.canAcknowledge && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={isAcknowledging}
                      onClick={() => onAcknowledge(row.id)}
                    >
                      {isAcknowledging && pendingId === row.id
                        ? 'Reconhecendo…'
                        : 'Reconhecer'}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
