import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatSkew, type ClockSkewSeverity } from '@/lib/clockSkew';

/** Linha de `camera_clock_skew_findings` (RLS: admin vê tudo, dono vê as suas). */
interface SkewFindingRow {
  id: string;
  camera_id: string | null;
  source_table: string;
  severity: ClockSkewSeverity;
  sample_count: number;
  median_skew_seconds: number;
  sentinel_rows: number;
  suppressed: boolean;
  reason: string;
  detected_at: string;
}

/** Cabeçalho da última varredura. */
interface SkewRunRow {
  ran_at: string;
  ok: boolean;
  cameras_analyzed: number;
  cameras_warning: number;
  cameras_critical: number;
}

const SEVERITY_LABEL: Record<ClockSkewSeverity, string> = {
  critical: 'crítico',
  warning: 'atenção',
  ok: 'ok',
  insufficient_data: 'sem dados',
};

const SEVERITY_VARIANT: Record<
  ClockSkewSeverity,
  'default' | 'destructive' | 'secondary' | 'outline'
> = {
  critical: 'destructive',
  warning: 'secondary',
  ok: 'default',
  insufficient_data: 'outline',
};

/**
 * Onda 112 — Câmeras com relógio descalibrado.
 *
 * A triagem da quarentena (Onda 109) diz *que* existem eventos com data
 * impossível; este card diz *qual equipamento* os produziu, comparando a hora
 * carimbada pela câmera com a hora de chegada do evento. Somente leitura.
 */
export function CameraClockSkewCard() {
  const [run, setRun] = useState<SkewRunRow | null>(null);
  const [rows, setRows] = useState<SkewFindingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: runData, error: runError } = await supabase
      .from('camera_clock_skew_runs')
      .select('ran_at, ok, cameras_analyzed, cameras_warning, cameras_critical')
      .order('ran_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (runError) {
      setError(runError.message ?? 'Falha ao carregar a varredura de relógio');
      setLoading(false);
      return;
    }
    setRun((runData as SkewRunRow | null) ?? null);

    const { data, error: queryError } = await supabase
      .from('camera_clock_skew_findings')
      .select(
        'id, camera_id, source_table, severity, sample_count, median_skew_seconds, sentinel_rows, suppressed, reason, detected_at'
      )
      .in('severity', ['critical', 'warning'])
      .order('detected_at', { ascending: false })
      .limit(10);

    if (queryError) {
      setError(queryError.message ?? 'Falha ao carregar os achados de relógio');
      setRows([]);
    } else {
      setRows((data ?? []) as SkewFindingRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const criticalCount = run?.cameras_critical ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Relógio das câmeras
          </CardTitle>
          <CardDescription>
            Varredura diária que compara a hora carimbada pelo equipamento com a hora de chegada do
            evento, isolando câmeras sem NTP antes que contaminem os relatórios.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Atualizar varredura de relógio"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>Não foi possível carregar</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : loading && rows.length === 0 && !run ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={criticalCount > 0 ? 'destructive' : 'outline'}>
                {criticalCount > 0
                  ? `${criticalCount} câmera(s) com relógio crítico`
                  : 'Nenhum relógio crítico'}
              </Badge>
              {run && (
                <span className="text-xs text-muted-foreground">
                  {run.cameras_analyzed} analisada(s) ·{' '}
                  {formatDistanceToNow(new Date(run.ran_at), { addSuffix: true, locale: ptBR })}
                </span>
              )}
            </div>

            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {run
                  ? 'Todas as câmeras com amostras suficientes estão dentro da tolerância.'
                  : 'Nenhuma varredura registrada ainda.'}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {rows.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant={SEVERITY_VARIANT[r.severity]}>
                      {SEVERITY_LABEL[r.severity]}
                    </Badge>
                    <span className="font-mono">{r.camera_id?.slice(0, 8) ?? '—'}</span>
                    <span className="text-muted-foreground">{r.source_table}</span>
                    <span className="font-medium">{formatSkew(Number(r.median_skew_seconds))}</span>
                    {r.sentinel_rows > 0 && (
                      <span className="text-muted-foreground">
                        · {r.sentinel_rows} carimbo(s) impossível(is)
                      </span>
                    )}
                    {r.suppressed && <Badge variant="outline">sem alerta</Badge>}
                    <span className="text-muted-foreground">· {r.reason}</span>
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

export default CameraClockSkewCard;
