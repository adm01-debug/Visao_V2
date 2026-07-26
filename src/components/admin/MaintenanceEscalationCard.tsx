import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, BellRing, Check, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ESCALATION_LEVEL_LABELS,
  evaluateEscalations,
  type AlertSnapshot,
  type EscalationLevel,
} from '@/lib/maintenanceEscalation';

interface OpenAlertRow {
  id: string;
  routine: string;
  severity: 'warning' | 'critical';
  reason: string;
  created_at: string;
  acknowledged_at: string | null;
  escalation_level: number;
  last_escalated_at: string | null;
}

interface DispatchRow {
  alert_id: string;
  status: string;
}

const LEVEL_VARIANT: Record<EscalationLevel, 'default' | 'destructive' | 'secondary' | 'outline'> = {
  0: 'outline',
  1: 'secondary',
  2: 'destructive',
  3: 'destructive',
};

function toLevel(value: number): EscalationLevel {
  if (value >= 3) return 3;
  if (value <= 0) return 0;
  return value === 1 ? 1 : 2;
}

/**
 * Onda 117 — Escalonamento de alertas não reconhecidos.
 *
 * Detectar e notificar não fecha incidente. Este card mostra quanto tempo cada
 * alerta está sem dono e em que degrau da escada ele já está, e oferece a única
 * ação que interrompe a escalada: **reconhecer**. Os degraus em si são aplicados
 * exclusivamente pela rotina agendada no banco — a UI nunca escala por conta.
 */
export function MaintenanceEscalationCard() {
  const [alerts, setAlerts] = useState<OpenAlertRow[]>([]);
  const [dispatches, setDispatches] = useState<DispatchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [acking, setAcking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from('maintenance_alert_events')
      .select('id, routine, severity, reason, created_at, acknowledged_at, escalation_level, last_escalated_at')
      .is('acknowledged_at', null)
      .order('created_at', { ascending: true })
      .limit(50);

    if (queryError) {
      setError(queryError.message ?? 'Falha ao carregar alertas abertos');
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as OpenAlertRow[];
    setAlerts(rows);

    if (rows.length > 0) {
      const { data: dispatchData } = await supabase
        .from('maintenance_alert_dispatches')
        .select('alert_id, status')
        .in(
          'alert_id',
          rows.map((r) => r.id),
        );
      setDispatches((dispatchData ?? []) as DispatchRow[]);
    } else {
      setDispatches([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const acknowledge = useCallback(
    async (alertId: string) => {
      setAcking(alertId);
      const { error: rpcError } = await supabase.rpc('acknowledge_maintenance_alert', { _alert_id: alertId });
      setAcking(null);

      if (rpcError) {
        toast({
          title: 'Não foi possível reconhecer',
          description: rpcError.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Alerta reconhecido',
        description: 'A escada de escalonamento foi congelada para este incidente.',
      });
      void load();
    },
    [load, toast],
  );

  const verdict = useMemo(() => {
    const snapshots: AlertSnapshot[] = alerts.map((a) => {
      const own = dispatches.filter((d) => d.alert_id === a.id);
      return {
        id: a.id,
        routine: a.routine,
        severity: a.severity,
        reason: a.reason,
        createdAtMs: new Date(a.created_at).getTime(),
        acknowledgedAtMs: a.acknowledged_at ? new Date(a.acknowledged_at).getTime() : null,
        escalationLevel: toLevel(a.escalation_level),
        lastEscalatedAtMs: a.last_escalated_at ? new Date(a.last_escalated_at).getTime() : null,
        dispatch: {
          delivered: own.some((d) => d.status === 'sent'),
          failedChannels: own.filter((d) => d.status === 'failed').length,
          neverAttempted: own.length === 0,
        },
      };
    });
    return evaluateEscalations({ nowMs: Date.now(), alerts: snapshots });
  }, [alerts, dispatches]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Escalonamento de alertas
          </CardTitle>
          <CardDescription>
            Tempo sem reconhecimento por incidente. Reconhecer congela a escada de urgência.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span className="sr-only">Atualizar</span>
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>Erro ao carregar</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && alerts.length === 0 && (
          <div className="space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        )}

        {!loading && !error && alerts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum alerta de manutenção aberto — todos foram reconhecidos ou não houve ocorrências.
          </p>
        )}

        {alerts.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {verdict.reason}
            </p>

            <ul className="divide-y divide-border">
              {verdict.decisions.map((decision) => {
                const row = alerts.find((a) => a.id === decision.alertId);
                if (!row) return null;
                const level = toLevel(row.escalation_level);
                return (
                  <li key={decision.alertId} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">{row.routine}</span>
                        <Badge variant={LEVEL_VARIANT[level]}>
                          {level} · {ESCALATION_LEVEL_LABELS[level]}
                        </Badge>
                        <Badge variant={row.severity === 'critical' ? 'destructive' : 'secondary'}>
                          {row.severity === 'critical' ? 'crítico' : 'aviso'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{decision.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        aberto{' '}
                        {formatDistanceToNow(new Date(row.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void acknowledge(decision.alertId)}
                      disabled={acking === decision.alertId}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      Reconhecer
                    </Button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
