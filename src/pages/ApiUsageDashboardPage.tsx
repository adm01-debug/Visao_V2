import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface UsageStats {
  window_days: number;
  totals: {
    total_requests: number;
    unique_users: number;
    error_rate_pct: number;
    avg_latency_ms: number;
    p95_latency_ms: number;
  };
  by_endpoint: Array<{ endpoint_group: string; count: number; avg_latency_ms: number }>;
  by_status: Record<string, number>;
  by_day: Array<{ day: string; count: number }>;
  generated_at: string;
}

/**
 * Onda 52 — Dashboard interno de uso da API.
 * Requer role admin (validado no RPC `get_api_usage_stats`).
 */
export default function ApiUsageDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["api-usage-stats", 7],
    queryFn: async (): Promise<UsageStats> => {
      const { data, error } = await supabase.rpc("get_api_usage_stats", { _days: 7 });
      if (error) throw error;
      return data as unknown as UsageStats;
    },
    staleTime: 60_000,
    retry: 1,
  });

  return (
    <div className="p-6">
      <Helmet><title>API Usage — VISÃO Admin</title></Helmet>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Uso da API REST v1</h1>
        <p className="text-muted-foreground">Últimos 7 dias — apenas administradores</p>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-2 p-6 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Erro ao carregar métricas: {(error as Error).message}</span>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <section aria-label="Totais" className="mb-8 grid gap-4 md:grid-cols-4">
            <StatCard label="Total de requisições" value={data.totals.total_requests.toLocaleString("pt-BR")} />
            <StatCard label="Usuários únicos" value={data.totals.unique_users.toString()} />
            <StatCard label="Taxa de erro" value={`${data.totals.error_rate_pct ?? 0}%`} />
            <StatCard label="Latência p95" value={`${Math.round(data.totals.p95_latency_ms ?? 0)}ms`} />
          </section>

          <section className="mb-8 grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Endpoints mais chamados</CardTitle>
                <CardDescription>Top 20 por volume</CardDescription>
              </CardHeader>
              <CardContent>
                {data.by_endpoint.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados no período.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.by_endpoint.slice(0, 10).map((row) => (
                      <li key={row.endpoint_group} className="flex items-center justify-between border-b border-border pb-1 text-sm">
                        <code className="text-foreground">{row.endpoint_group}</code>
                        <span className="text-muted-foreground">
                          {row.count.toLocaleString("pt-BR")} • {Math.round(row.avg_latency_ms)}ms
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição por status</CardTitle>
                <CardDescription>HTTP status codes</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {Object.entries(data.by_status).sort().map(([status, count]) => (
                    <li key={status} className="flex items-center justify-between text-sm">
                      <span className={`font-mono ${Number(status) >= 400 ? "text-destructive" : "text-foreground"}`}>
                        {status}
                      </span>
                      <span className="text-muted-foreground">{count.toLocaleString("pt-BR")}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Volume por dia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-40">
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
            </CardContent>
          </Card>

          <p className="mt-6 text-xs text-muted-foreground">
            Gerado em {new Date(data.generated_at).toLocaleString("pt-BR")}
          </p>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
