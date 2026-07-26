import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, BellRing, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MAINTENANCE_SOURCE_LABELS } from '@/lib/maintenanceSourceAlerts';

/** Severidades possíveis retornadas pelo avaliador. */
type MaintenanceSeverity = 'none' | 'warning' | 'critical';

/** Linha da RPC `get_maintenance_alert_status` (admin-only). */
interface MaintenanceStatusRow {
  routine: string;
  ran_at: string | null;
  severity: MaintenanceSeverity;
  reason: string;
}

/** Alerta persistido em `maintenance_alert_events`. */
interface MaintenanceAlertRow {
  id: string;
  routine: string;
  severity: 'warning' | 'critical';
  reason: string;
  created_at: string;
}

/** Rótulos legíveis para cada rotina noturna monitorada. */
const ROUTINE_LABELS: Record<string, string> = {
  partition_maintenance: 'Cobertura de partições',
  partition_drain: 'Drenagem da DEFAULT',
  partition_quarantine: 'Triagem da quarentena',
  // Onda 114: detectores especializados encaminhados ao mesmo barramento.
  ...MAINTENANCE_SOURCE_LABELS,
};

const SEVERITY_VARIANT: Record<MaintenanceSeverity, 'outline' | 'secondary' | 'destructive'> = {
  none: 'outline',
  warning: 'secondary',
  critical: 'destructive',
};

const SEVERITY_LABEL: Record<MaintenanceSeverity, string> = {
  none: 'saudável',
  warning: 'atenção',
  critical: 'crítico',
};

/**
 * Onda 110 — Vigilância das rotinas noturnas de manutenção.
 *
 * O modo de falha mais perigoso não é a rotina que quebra ruidosamente, e sim
 * a que simplesmente para de rodar. O avaliador horário registra cada desvio;
 * este card apenas expõe o que ele já concluiu — não dispara manutenção.
 */
export function MaintenanceAlertsCard() {
  const [statuses, setStatuses] = useState<MaintenanceStatusRow[]>([]);
  const [alerts, setAlerts] = useState<MaintenanceAlertRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [statusRes, alertRes] = await Promise.all([
      supabase.rpc('get_maintenance_alert_status'),
      supabase
        .from('maintenance_alert_events')
        .select('id, routine, severity, reason, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    if (statusRes.error) {
      setError(statusRes.error.message ?? 'Falha ao carregar a vigilância de manutenção');
      setStatuses([]);
    } else {
      setStatuses(((statusRes.data ?? []) as MaintenanceStatusRow[]).slice());
    }

    setAlerts(alertRes.error ? [] : ((alertRes.data ?? []) as MaintenanceAlertRow[]));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const criticalCount = statuses.filter((s) => s.severity === 'critical').length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <BellRing className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Vigilância da manutenção
          </CardTitle>
          <CardDescription>
            As três rotinas noturnas são avaliadas de hora em hora — silêncio prolongado ou falha
            vira alerta registrado.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Atualizar vigilância da manutenção"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>Não foi possível carregar</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : loading && statuses.length === 0 ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        ) : (
          <>
            <Badge variant={criticalCount > 0 ? 'destructive' : 'outline'}>
              {criticalCount > 0
                ? `${criticalCount} rotina(s) em estado crítico`
                : 'Todas as rotinas dentro da janela'}
            </Badge>

            <ul className="space-y-2">
              {statuses.map((s) => (
                <li
                  key={s.routine}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm"
                >
                  <span className="font-medium">{ROUTINE_LABELS[s.routine] ?? s.routine}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {s.ran_at
                        ? formatDistanceToNow(new Date(s.ran_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })
                        : 'nunca executou'}
                    </span>
                    <Badge variant={SEVERITY_VARIANT[s.severity]}>
                      {SEVERITY_LABEL[s.severity]}
                    </Badge>
                  </div>
                </li>
              ))}
              {statuses.length === 0 && (
                <li className="text-sm text-muted-foreground">
                  Nenhuma rotina registrada ainda.
                </li>
              )}
            </ul>

            <div className="border-t border-border pt-3">
              <p className="mb-2 text-sm font-medium">Últimos alertas</p>
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum alerta registrado nos últimos 90 dias.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {alerts.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant={a.severity === 'critical' ? 'destructive' : 'secondary'}>
                        {a.severity === 'critical' ? 'crítico' : 'atenção'}
                      </Badge>
                      <span className="font-medium">
                        {ROUTINE_LABELS[a.routine] ?? a.routine}
                      </span>
                      <span className="text-muted-foreground">{a.reason}</span>
                      <span className="text-muted-foreground">
                        ·{' '}
                        {formatDistanceToNow(new Date(a.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
