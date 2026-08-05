import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, GitMerge, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  correlateRootCause,
  EMPTY_BUCKETS,
  type CorrelationVerdict,
  type CulpritConfidence,
  type RootCauseCorrelation,
  type SkewFindingLike,
  type BacklogGrowthLike,
} from '@/lib/rootCauseCorrelation';

/** Linha bruta de `root_cause_correlation_runs` (RLS: somente admin lê). */
interface CorrelationRunRow {
  ran_at: string;
  ok: boolean;
  error_detail: string | null;
  window_hours: number;
  parents_analyzed: number;
  cameras_considered: number;
  growth: unknown;
  skew_findings: unknown;
}

const VERDICT_LABEL: Record<CorrelationVerdict, string> = {
  attributed: 'causa identificada',
  partial: 'causa parcial',
  unexplained: 'sem causa identificada',
  no_backlog: 'estável',
  insufficient_data: 'dados insuficientes',
};

const VERDICT_VARIANT: Record<
  CorrelationVerdict,
  'default' | 'destructive' | 'secondary' | 'outline'
> = {
  attributed: 'default',
  partial: 'secondary',
  unexplained: 'destructive',
  no_backlog: 'outline',
  insufficient_data: 'outline',
};

const CONFIDENCE_LABEL: Record<CulpritConfidence, string> = {
  high: 'confiança alta',
  medium: 'confiança média',
  low: 'confiança baixa',
};

/** Conversão snake_case (banco) → camelCase (política). Tolerante a nulos. */
function toGrowth(raw: unknown): BacklogGrowthLike[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const g = item as Record<string, unknown>;
    const b = (g.buckets ?? null) as Record<string, unknown> | null;
    return {
      parent: String(g.parent ?? ''),
      currentRows: Number(g.current_rows ?? 0),
      rowsAddedInWindow: Number(g.rows_added_in_window ?? 0),
      windowHours: Number(g.window_hours ?? 0),
      buckets: b
        ? {
            pre2000: Number(b.pre2000 ?? 0),
            future: Number(b.future ?? 0),
            recentGap: Number(b.recentGap ?? 0),
            unknown: Number(b.unknown ?? 0),
          }
        : EMPTY_BUCKETS,
    };
  });
}

function toFindings(raw: unknown): SkewFindingLike[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const f = item as Record<string, unknown>;
    return {
      cameraId: String(f.camera_id ?? ''),
      cameraName: (f.camera_name as string | null) ?? null,
      sourceTable: String(f.source_table ?? ''),
      severity: (f.severity as SkewFindingLike['severity']) ?? 'ok',
      direction: (f.direction as SkewFindingLike['direction']) ?? 'none',
      sampleCount: Number(f.sample_count ?? 0),
      medianSkewSeconds: Number(f.median_skew_seconds ?? 0),
      sentinelRows: Number(f.sentinel_rows ?? 0),
      detectedAtMs: Number(f.detected_at_ms ?? 0),
      suppressed: Boolean(f.suppressed),
    };
  });
}

/**
 * Onda 116 — Correlação automática de causa raiz.
 *
 * Costura três sintomas que hoje o operador precisa juntar de cabeça: o
 * crescimento do backlog (Onda 113), as câmeras com relógio errado (Onda 112) e
 * a assinatura temporal do resíduo (Onda 109). Mostra o quanto do crescimento
 * tem dono — e, principalmente, o quanto NÃO tem. Somente leitura.
 */
export function RootCauseCorrelationCard() {
  const [run, setRun] = useState<CorrelationRunRow | null>(null);
  const [correlations, setCorrelations] = useState<RootCauseCorrelation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('root_cause_correlation_runs')
      .select(
        'ran_at, ok, error_detail, window_hours, parents_analyzed, cameras_considered, growth, skew_findings'
      )
      .order('ran_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    const row = (data as CorrelationRunRow | null) ?? null;
    setRun(row);
    setCorrelations(
      row
        ? correlateRootCause({
            nowMs: Date.now(),
            growth: toGrowth(row.growth),
            skewFindings: toFindings(row.skew_findings),
          })
        : []
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const actionable = correlations.filter(
    (c) => c.verdict !== 'no_backlog' && c.verdict !== 'insufficient_data'
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitMerge className="h-4 w-4 text-muted-foreground" aria-hidden />
            Causa raiz do backlog
          </CardTitle>
          <CardDescription>
            Liga o crescimento das partições às câmeras com relógio descalibrado e destaca o que
            permanece sem explicação.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Recarregar correlação de causa raiz"
        >
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && correlations.length === 0 ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            <AlertTitle>Falha ao carregar</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {!loading && !error && !run ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma correlação registrada ainda. A rotina executa a cada 6 horas.
          </p>
        ) : null}

        {run ? (
          <p className="text-xs text-muted-foreground">
            Última execução{' '}
            {formatDistanceToNow(new Date(run.ran_at), { addSuffix: true, locale: ptBR })} · janela
            de {run.window_hours}h · {run.parents_analyzed} tabela(s) · {run.cameras_considered}{' '}
            achado(s) de relógio
            {run.ok ? '' : ` · falhou: ${run.error_detail ?? 'sem detalhe'}`}
          </p>
        ) : null}

        {run && actionable.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum crescimento de backlog relevante na janela — nada a correlacionar.
          </p>
        ) : null}

        <ul className="space-y-3">
          {actionable.map((c) => (
            <li key={c.parent} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-foreground">{c.parent}</span>
                <Badge variant={VERDICT_VARIANT[c.verdict]}>{VERDICT_LABEL[c.verdict]}</Badge>
                <span className="text-xs text-muted-foreground">
                  +{c.rowsAddedInWindow.toLocaleString('pt-BR')} linhas em{' '}
                  {c.windowHours.toFixed(1)}h · {Math.round(c.attributedRatio * 100)}% atribuído
                </span>
              </div>

              <p className="mt-2 text-sm text-foreground">{c.recommendation}</p>

              {c.culprits.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {c.culprits.map((culprit) => (
                    <li
                      key={culprit.cameraId}
                      className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
                    >
                      <span className="text-foreground">
                        {culprit.cameraName ?? `câmera ${culprit.cameraId.slice(0, 8)}`}
                      </span>
                      <Badge variant="outline">
                        {Math.round(culprit.contributionRatio * 100)}%
                      </Badge>
                      <span>{CONFIDENCE_LABEL[culprit.confidence]}</span>
                      <span>· {culprit.reasons.join('; ')}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default RootCauseCorrelationCard;
