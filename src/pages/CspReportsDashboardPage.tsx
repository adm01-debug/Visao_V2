import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ShieldAlert, RefreshCw } from 'lucide-react';
import { PageContent } from '@/components/layout/MainLayout';

interface CspStats {
  window_days: number;
  totals: {
    total_reports: number;
    unique_directives: number;
    unique_blocked: number;
    unique_documents: number;
    enforced: number;
    report_only: number;
  };
  by_directive: Array<{ directive: string; count: number }>;
  by_blocked: Array<{ blocked_uri: string; count: number; last_seen: string }>;
  by_document: Array<{ document_uri: string; count: number }>;
  by_day: Array<{ day: string; count: number }>;
  recent: Array<{
    id: string;
    created_at: string;
    document_uri: string | null;
    blocked_uri: string | null;
    directive: string | null;
    source_file: string | null;
    line_number: number | null;
    disposition: string | null;
  }>;
  generated_at: string;
}

const WINDOWS = [1, 7, 30, 90] as const;

/**
 * Onda 64 — Dashboard admin de relatórios CSP.
 * RPC `get_csp_report_stats` valida role admin server-side.
 */
export default function CspReportsDashboardPage() {
  const [days, setDays] = useState<number>(7);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['csp-report-stats', days],
    queryFn: async (): Promise<CspStats> => {
      const { data, error } = await supabase.rpc('get_csp_report_stats', { _days: days });
      if (error) throw error;
      return data as unknown as CspStats;
    },
    staleTime: 60_000,
    retry: 1,
  });

  return (
    <PageContent className="p-6">
      <Helmet>
        <title>Relatórios CSP — VISÃO Admin</title>
      </Helmet>

      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground">
            <ShieldAlert className="h-7 w-7 text-primary" aria-hidden="true" />
            Relatórios CSP
          </h1>
          <p className="text-muted-foreground">
            Violações de Content Security Policy — últimos {days} {days === 1 ? 'dia' : 'dias'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1" role="group" aria-label="Janela de tempo">
            {WINDOWS.map((w) => (
              <Button
                key={w}
                size="sm"
                variant={days === w ? 'default' : 'outline'}
                onClick={() => setDays(w)}
                aria-pressed={days === w}
              >
                {w}d
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Atualizar"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-2 p-6 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Erro ao carregar relatórios: {(error as Error).message}</span>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <section aria-label="Totais" className="mb-8 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <StatCard
              label="Total de violações"
              value={data.totals.total_reports.toLocaleString('pt-BR')}
            />
            <StatCard label="Diretivas únicas" value={data.totals.unique_directives.toString()} />
            <StatCard label="URIs bloqueadas" value={data.totals.unique_blocked.toString()} />
            <StatCard label="Documentos afetados" value={data.totals.unique_documents.toString()} />
            <StatCard
              label="Enforce"
              value={data.totals.enforced.toLocaleString('pt-BR')}
              tone="destructive"
            />
            <StatCard
              label="Report-only"
              value={data.totals.report_only.toLocaleString('pt-BR')}
              tone="muted"
            />
          </section>

          <section className="mb-8 grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Diretivas violadas</CardTitle>
                <CardDescription>Top 20 por volume</CardDescription>
              </CardHeader>
              <CardContent>
                {data.by_directive.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sem violações registradas no período. 🎉
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {data.by_directive.slice(0, 10).map((row) => (
                      <li
                        key={row.directive}
                        className="flex items-center justify-between border-b border-border pb-1 text-sm"
                      >
                        <code className="truncate text-foreground">{row.directive}</code>
                        <Badge variant="secondary">{row.count.toLocaleString('pt-BR')}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>URIs bloqueadas</CardTitle>
                <CardDescription>Top 20 por volume</CardDescription>
              </CardHeader>
              <CardContent>
                {data.by_blocked.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados no período.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.by_blocked.slice(0, 10).map((row) => (
                      <li
                        key={row.blocked_uri}
                        className="flex items-center justify-between gap-2 border-b border-border pb-1 text-sm"
                      >
                        <code className="truncate text-foreground" title={row.blocked_uri}>
                          {row.blocked_uri}
                        </code>
                        <Badge variant="secondary">{row.count.toLocaleString('pt-BR')}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Volume por dia</CardTitle>
            </CardHeader>
            <CardContent>
              {data.by_day.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem violações no período.</p>
              ) : (
                <div className="flex h-40 items-end gap-1">
                  {data.by_day.map((d) => {
                    const max = Math.max(...data.by_day.map((x) => x.count), 1);
                    const pct = (d.count / max) * 100;
                    return (
                      <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t bg-primary"
                          style={{ height: `${pct}%` }}
                          title={`${d.day}: ${d.count}`}
                        />
                        <span className="text-xs text-muted-foreground">{d.day.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Eventos recentes</CardTitle>
              <CardDescription>Últimos 50 relatórios</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {data.recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum relatório registrado ainda.</p>
              ) : (
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3">Quando</th>
                      <th className="py-2 pr-3">Diretiva</th>
                      <th className="py-2 pr-3">Bloqueado</th>
                      <th className="py-2 pr-3">Documento</th>
                      <th className="py-2 pr-3">Disposition</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((row) => (
                      <tr key={row.id} className="border-b border-border/50">
                        <td className="py-2 pr-3 text-muted-foreground">
                          {new Date(row.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-2 pr-3">
                          <code className="text-foreground">{row.directive ?? '—'}</code>
                        </td>
                        <td className="py-2 pr-3">
                          <code className="text-foreground" title={row.blocked_uri ?? ''}>
                            {truncate(row.blocked_uri ?? 'inline', 48)}
                          </code>
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">
                          {truncate(row.document_uri ?? '—', 40)}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge
                            variant={row.disposition === 'enforce' ? 'destructive' : 'secondary'}
                          >
                            {row.disposition ?? '—'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <p className="mt-6 text-xs text-muted-foreground">
            Gerado em {new Date(data.generated_at).toLocaleString('pt-BR')}
          </p>
        </>
      )}
    </PageContent>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'destructive' | 'muted';
}) {
  const valueClass =
    tone === 'destructive'
      ? 'text-destructive'
      : tone === 'muted'
        ? 'text-muted-foreground'
        : 'text-foreground';
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`mt-2 text-3xl font-bold ${valueClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
