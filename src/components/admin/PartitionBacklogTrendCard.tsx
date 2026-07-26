import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, TrendingDown, TrendingUp, Minus, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  DEFAULT_BACKLOG_TREND_THRESHOLDS,
  describeTrend,
  evaluateBacklogSeries,
  formatHours,
  type BacklogSeries,
  type BacklogSeverity,
  type BacklogTrend,
  type BacklogVerdict,
} from '@/lib/partitionBacklogTrend';

/** Linha bruta de `partition_backlog_samples` (RLS: somente admin). */
interface BacklogSampleRow {
  parent_table: string;
  default_partition: string;
  row_count: number;
  sampled_at: string;
}

const SEVERITY_LABEL: Record<BacklogSeverity, string> = {
  critical: 'crítico',
  warning: 'atenção',
  ok: 'ok',
};

const SEVERITY_VARIANT: Record<BacklogSeverity, 'default' | 'destructive' | 'secondary'> = {
  critical: 'destructive',
  warning: 'secondary',
  ok: 'default',
};

/** Ícone coerente com a direção da série, com significado redundante ao texto. */
function TrendIcon({ trend }: { trend: BacklogTrend }) {
  if (trend === 'growing') return <TrendingUp className="h-4 w-4 text-destructive" aria-hidden />;
  if (trend === 'draining') return <TrendingDown className="h-4 w-4 text-primary" aria-hidden />;
  return <Minus className="h-4 w-4 text-muted-foreground" aria-hidden />;
}

/** Sparkline puramente decorativa da série, normalizada ao maior valor. */
function Sparkline({ values }: { values: readonly number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-8 items-end gap-px" aria-hidden>
      {values.slice(-40).map((v, i) => (
        <div
          key={i}
          className="w-1 rounded-sm bg-primary/40"
          style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Onda 113 — Tendência e projeção de saturação do backlog da partição DEFAULT.
 *
 * As Ondas 108/109 respondem "quanto há" e "que tipo de lixo é". Este card
 * responde a pergunta que antecede o incidente: **em quanto tempo satura?**
 *
 * Ponto de arquitetura: a classificação NÃO é replicada aqui. O componente lê
 * as amostras brutas e delega a `evaluateBacklogSeries`, a mesma função usada
 * pelo gate de CI — o painel e o alerta não podem divergir.
 */
export function PartitionBacklogTrendCard() {
  const [rows, setRows] = useState<BacklogSampleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const since = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
    const { data, error: queryError } = await supabase
      .from('partition_backlog_samples')
      .select('parent_table, default_partition, row_count, sampled_at')
      .gte('sampled_at', since)
      .order('sampled_at', { ascending: true })
      .limit(2000);

    if (queryError) {
      setError(queryError.message);
      setRows([]);
    } else {
      setRows((data ?? []) as BacklogSampleRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Agrupa por pai e avalia. Recalcula só quando as amostras mudam. */
  const verdicts: BacklogVerdict[] = useMemo(() => {
    const byParent = new Map<string, BacklogSeries>();
    for (const row of rows) {
      const existing = byParent.get(row.parent_table);
      const sample = {
        sampledAtMs: Date.parse(row.sampled_at),
        rowCount: Number(row.row_count),
      };
      if (existing) {
        (existing.samples as { sampledAtMs: number; rowCount: number }[]).push(sample);
      } else {
        byParent.set(row.parent_table, {
          parent: row.parent_table,
          defaultPartition: row.default_partition,
          samples: [sample],
        });
      }
    }
    const now = Date.now();
    return [...byParent.values()]
      .map((s) => evaluateBacklogSeries(s, now, DEFAULT_BACKLOG_TREND_THRESHOLDS))
      .sort((a, b) => b.currentRows - a.currentRows);
  }, [rows]);

  const worst = verdicts.reduce<BacklogSeverity>(
    (acc, v) => (v.severity === 'critical' ? 'critical' : v.severity === 'warning' && acc === 'ok' ? 'warning' : acc),
    'ok',
  );

  const seriesByParent = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const row of rows) {
      const list = map.get(row.parent_table) ?? [];
      list.push(Number(row.row_count));
      map.set(row.parent_table, list);
    }
    return map;
  }, [rows]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" aria-hidden />
            Tendência do backlog de contingência
          </CardTitle>
          <CardDescription>
            Projeção de saturação das partições DEFAULT a partir da inclinação robusta das últimas amostras.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {verdicts.length > 0 && (
            <Badge variant={SEVERITY_VARIANT[worst]}>{SEVERITY_LABEL[worst]}</Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Recarregar tendência de backlog"
          >
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && rows.length === 0 && (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            <AlertTitle>Não foi possível carregar as amostras</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && verdicts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma amostra de backlog nos últimos 7 dias. O coletor roda a cada 30 minutos.
          </p>
        )}

        {verdicts.map((v) => (
          <div key={v.parent} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendIcon trend={v.trend} />
                <span className="font-medium">{v.parent}</span>
                <Badge variant={SEVERITY_VARIANT[v.severity]}>{SEVERITY_LABEL[v.severity]}</Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                {v.currentRows.toLocaleString('pt-BR')} linha(s) paradas
              </span>
            </div>

            <div className="mt-2 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              <span>
                Tendência: <strong className="text-foreground">{describeTrend(v.trend)}</strong>
                {v.slopePerHour !== null && ` (${v.slopePerHour.toFixed(1)}/h)`}
              </span>
              <span>
                Saturação:{' '}
                <strong className="text-foreground">
                  {v.hoursToSaturation === null ? 'não prevista' : formatHours(v.hoursToSaturation)}
                </strong>
              </span>
              <span>
                Última amostra:{' '}
                {v.sampleAgeHours === null
                  ? '—'
                  : formatDistanceToNow(new Date(Date.now() - v.sampleAgeHours * 3_600_000), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
              </span>
            </div>

            <div className="mt-2">
              <Sparkline values={seriesByParent.get(v.parent) ?? []} />
            </div>

            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {v.reasons.map((reason) => (
                <li key={reason}>• {reason}</li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default PartitionBacklogTrendCard;
