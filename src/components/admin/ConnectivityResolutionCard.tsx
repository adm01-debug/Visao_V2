/**
 * VISÃO — Card administrativo com métricas do assistente de conectividade.
 *
 * Consulta `connectivity_resolution_telemetry` e mostra:
 *   - Total de resoluções na janela e taxa geral de sucesso.
 *   - Distribuição por caminho (relé / VPN / port-forward / cancelado).
 *   - Taxa de sucesso por caminho e duração média até resolver.
 *
 * Acesso: usuário vê os próprios eventos; admin vê os de todos (política RLS).
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Activity, CheckCircle2, XCircle } from 'lucide-react';

type Row = {
  chosen_path: string;
  succeeded: boolean | null;
  duration_ms: number | null;
  created_at: string;
};

const PATH_LABEL: Record<string, string> = {
  relay: 'Agente Local',
  vpn: 'VPN',
  port_forward: 'Port-forward',
  cancelled: 'Cancelado',
};

interface Props {
  windowHours?: number;
}

export function ConnectivityResolutionCard({ windowHours = 168 }: Props) {
  const since = useMemo(
    () => new Date(Date.now() - windowHours * 3_600_000).toISOString(),
    [windowHours]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['connectivity-resolution', windowHours],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from('connectivity_resolution_telemetry')
        .select('chosen_path, succeeded, duration_ms, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    retry: 1,
  });

  const stats = useMemo(() => {
    const rows = data ?? [];
    const total = rows.length;
    const succeeded = rows.filter((r) => r.succeeded === true).length;
    const failed = rows.filter((r) => r.succeeded === false).length;
    const successRate = total ? Math.round((succeeded / total) * 100) : 0;

    const byPath = new Map<string, { total: number; ok: number; durations: number[] }>();
    for (const r of rows) {
      const b = byPath.get(r.chosen_path) ?? { total: 0, ok: 0, durations: [] };
      b.total += 1;
      if (r.succeeded === true) b.ok += 1;
      if (typeof r.duration_ms === 'number' && r.duration_ms > 0) b.durations.push(r.duration_ms);
      byPath.set(r.chosen_path, b);
    }
    const perPath = Array.from(byPath.entries())
      .map(([path, b]) => ({
        path,
        total: b.total,
        ok: b.ok,
        successRate: b.total ? Math.round((b.ok / b.total) * 100) : 0,
        avgMs: b.durations.length
          ? Math.round(b.durations.reduce((a, b) => a + b, 0) / b.durations.length)
          : null,
      }))
      .sort((a, b) => b.total - a.total);

    return { total, succeeded, failed, successRate, perPath };
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Assistente de conectividade
        </CardTitle>
        <CardDescription>
          Resoluções aplicadas quando o host da câmera é bloqueado (últimas {windowHours}h)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Não foi possível carregar as métricas.
          </div>
        ) : stats.total === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum uso do assistente na janela selecionada.
          </p>
        ) : (
          <div className="space-y-4">
            {stats.total >= 10 && stats.successRate < 60 && (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Saúde crítica do assistente</p>
                  <p className="text-xs text-destructive/80">
                    Taxa de sucesso {stats.successRate}% em {stats.total} tentativas nas últimas{' '}
                    {windowHours}h. Verifique agentes locais, VPNs e regras de port-forward.
                  </p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Total" value={stats.total.toString()} />
              <Metric
                label="Sucesso"
                value={`${stats.successRate}%`}
                icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              />
              <Metric
                label="Falhas"
                value={stats.failed.toString()}
                icon={<XCircle className="h-4 w-4 text-destructive" />}
              />
            </div>
            <div className="space-y-2">
              {stats.perPath.map((p) => (
                <div
                  key={p.path}
                  className="flex items-center justify-between rounded-md border border-border/50 bg-muted/30 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{PATH_LABEL[p.path] ?? p.path}</Badge>
                    <span className="text-sm text-muted-foreground">{p.total} evento(s)</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {p.path !== 'cancelled' && (
                      <span
                        className={
                          p.successRate >= 80
                            ? 'text-emerald-600'
                            : p.successRate >= 50
                              ? 'text-amber-600'
                              : 'text-destructive'
                        }
                      >
                        {p.successRate}% ok
                      </span>
                    )}
                    {p.avgMs !== null && <span>~{(p.avgMs / 1000).toFixed(1)}s</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/50 bg-muted/30 p-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
