import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Droplets, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/** Linha da RPC `get_partition_default_backlog` (admin-only). */
interface BacklogRow {
  parent: string;
  default_partition: string;
  row_estimate: number;
}

/** Recorte usado da telemetria `partition_drain_runs`. */
interface DrainRun {
  ran_at: string;
  duration_ms: number | null;
  moved_rows: number;
  quarantined: number;
  locked_out: boolean;
  ok: boolean;
  error_detail: string | null;
}

/**
 * Acima deste backlog o `CREATE TABLE ... PARTITION OF` do mês seguinte passa
 * a escanear a DEFAULT sob ACCESS EXCLUSIVE, travando a ingestão. Mesmo limiar
 * usado pelo gate `npm run db:check:drain`.
 */
const BACKLOG_ALERT_THRESHOLD = 50_000;

/**
 * Onda 108 — Observabilidade da drenagem do balde de contingência.
 *
 * Mostra quantos registros seguem presos em cada partição DEFAULT e o
 * resultado da última execução da rotina de drenagem. Somente administradores
 * conseguem ler os dados (RLS + guarda na função).
 */
export function PartitionDrainCard() {
  const [backlog, setBacklog] = useState<BacklogRow[]>([]);
  const [lastRun, setLastRun] = useState<DrainRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [backlogRes, runRes] = await Promise.all([
      supabase.rpc('get_partition_default_backlog'),
      supabase
        .from('partition_drain_runs')
        .select('ran_at, duration_ms, moved_rows, quarantined, locked_out, ok, error_detail')
        .order('ran_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (backlogRes.error) {
      setError(backlogRes.error.message ?? 'Falha ao carregar o backlog das partições');
      setBacklog([]);
    } else {
      setBacklog(((backlogRes.data ?? []) as BacklogRow[]).slice());
    }

    setLastRun(runRes.error ? null : ((runRes.data as DrainRun | null) ?? null));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalBacklog = backlog.reduce((sum, row) => sum + Number(row.row_estimate ?? 0), 0);
  const critical = totalBacklog > BACKLOG_ALERT_THRESHOLD;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Droplets className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Drenagem de partições
          </CardTitle>
          <CardDescription>
            Registros com data fora da cobertura caem no balde de contingência e são movidos
            diariamente para o mês correto.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Atualizar drenagem de partições"
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
        ) : loading && backlog.length === 0 ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Badge
                variant={critical ? 'destructive' : totalBacklog > 0 ? 'secondary' : 'outline'}
              >
                {totalBacklog.toLocaleString('pt-BR')} registro(s) na contingência
              </Badge>
              {critical && (
                <span className="text-xs text-destructive">
                  Acima do limite seguro de {BACKLOG_ALERT_THRESHOLD.toLocaleString('pt-BR')}
                </span>
              )}
            </div>

            {backlog.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma tabela particionada com balde de contingência.
              </p>
            ) : (
              <ul className="space-y-1">
                {backlog.map((row) => (
                  <li
                    key={row.default_partition}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{row.parent}</span>
                    <span className="text-muted-foreground">
                      {Number(row.row_estimate ?? 0).toLocaleString('pt-BR')}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-border pt-3 text-sm">
              {!lastRun ? (
                <p className="text-muted-foreground">A drenagem ainda não foi executada.</p>
              ) : (
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={lastRun.ok ? 'outline' : 'destructive'}>
                      {lastRun.ok ? 'última execução OK' : 'última execução falhou'}
                    </Badge>
                    {lastRun.locked_out && <Badge variant="secondary">ignorada por trava</Badge>}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(lastRun.ran_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    {lastRun.moved_rows.toLocaleString('pt-BR')} movido(s) ·{' '}
                    {lastRun.quarantined.toLocaleString('pt-BR')} em quarentena
                    {lastRun.duration_ms !== null && lastRun.duration_ms !== undefined
                      ? ` · ${lastRun.duration_ms} ms`
                      : ''}
                  </p>
                  {lastRun.error_detail && !lastRun.ok && (
                    <p className="text-xs text-destructive">{lastRun.error_detail}</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
