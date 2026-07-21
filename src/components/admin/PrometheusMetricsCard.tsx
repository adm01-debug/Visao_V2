import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

/**
 * Onda Storage 17 — Card com instruções de scrape do endpoint /metrics.
 * O bearer token é secreto (PROMETHEUS_METRICS_BEARER_TOKEN) e nunca
 * é exposto ao frontend — apenas o admin da infraestrutura o utiliza.
 */
export function PrometheusMetricsCard() {
  const url = `${SUPABASE_URL}/functions/v1/metrics-prometheus`;
  const snippet = `scrape_configs:
  - job_name: 'visao-tiering'
    scrape_interval: 60s
    metrics_path: /functions/v1/metrics-prometheus
    scheme: https
    static_configs:
      - targets: ['${new URL(SUPABASE_URL).host}']
    authorization:
      type: Bearer
      credentials_file: /etc/prometheus/visao_token`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" aria-hidden />
            <CardTitle>Exporter Prometheus</CardTitle>
          </div>
          <Badge variant="secondary">Onda 17</Badge>
        </div>
        <CardDescription>
          Métricas SLO de tiering, restaurações Glacier e alertas presos expostas em formato Prometheus.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-1">Endpoint</p>
          <code className="block rounded-md bg-muted px-3 py-2 text-xs break-all">{url}</code>
        </div>
        <div>
          <p className="text-sm font-medium mb-1">Autenticação</p>
          <p className="text-sm text-muted-foreground">
            Header <code className="text-xs">Authorization: Bearer &lt;PROMETHEUS_METRICS_BEARER_TOKEN&gt;</code>.
            Token secreto — solicite ao responsável pela infraestrutura.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium mb-1">Métricas expostas</p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li><code className="text-xs">visao_tiering_p95_seconds{`{operation}`}</code></li>
            <li><code className="text-xs">visao_tiering_success_ratio{`{operation}`}</code></li>
            <li><code className="text-xs">visao_tiering_slo_status{`{operation}`}</code> (0=ok, 1=risk, 2=violated, 3=no_data)</li>
            <li><code className="text-xs">visao_glacier_restore_pending_total</code></li>
            <li><code className="text-xs">visao_glacier_restore_stuck_total</code></li>
            <li><code className="text-xs">visao_glacier_stuck_alerts_24h</code></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium mb-1">Exemplo prometheus.yml</p>
          <pre className="rounded-md bg-muted px-3 py-2 text-xs overflow-x-auto whitespace-pre">{snippet}</pre>
        </div>
        <p className="text-xs text-muted-foreground">
          Rate-limit: 30 req/min por IP. Recomendado scrape_interval ≥ 30s.
        </p>
      </CardContent>
    </Card>
  );
}
