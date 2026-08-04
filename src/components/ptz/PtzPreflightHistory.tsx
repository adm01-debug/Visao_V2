import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Octagon, ShieldCheck, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

/**
 * Histórico auditável de execuções de pré-voo para um eixo específico.
 * Renderiza as últimas N execuções mostrando marcas de confirmação do
 * checklist de segurança + resultado consolidado da execução.
 */

type Outcome = 'ok' | 'deviation' | 'fail' | 'aborted' | 'no-telemetry';

interface PreflightRunRow {
  id: string;
  created_at: string;
  outcome: Outcome;
  aborted: boolean;
  status_supported: boolean;
  ack_area_clear: boolean;
  ack_watching_live: boolean;
  ack_confirmed_at: string | null;
  phases: Array<{
    id: string;
    target: number;
    observed: number | null;
    delta: number | null;
    latency_ms: number;
    outcome: string;
    detail: string | null;
  }>;
}

interface Props {
  cameraId?: string;
  axis: 'pan' | 'tilt' | 'zoom';
  /** Chave para forçar refetch quando o pai concluir uma nova execução. */
  refreshKey?: number;
  limit?: number;
}

const outcomeBadge = (o: Outcome) => {
  if (o === 'ok')
    return (
      <Badge variant="secondary" className="text-[10px]">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        ok
      </Badge>
    );
  if (o === 'deviation')
    return (
      <Badge variant="outline" className="text-[10px]">
        <AlertTriangle className="w-3 h-3 mr-1" />
        desvio
      </Badge>
    );
  if (o === 'aborted')
    return (
      <Badge variant="outline" className="text-[10px]">
        <Octagon className="w-3 h-3 mr-1" />
        abortado
      </Badge>
    );
  if (o === 'no-telemetry')
    return (
      <Badge variant="outline" className="text-[10px]">
        <AlertTriangle className="w-3 h-3 mr-1" />
        sem telemetria
      </Badge>
    );
  return (
    <Badge variant="destructive" className="text-[10px]">
      <XCircle className="w-3 h-3 mr-1" />
      falha
    </Badge>
  );
};

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

export function PtzPreflightHistory({ cameraId, axis, refreshKey = 0, limit = 5 }: Props) {
  const [rows, setRows] = useState<PreflightRunRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!cameraId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ptz_preflight_runs')
        .select(
          'id, created_at, outcome, aborted, status_supported, ack_area_clear, ack_watching_live, ack_confirmed_at, phases'
        )
        .eq('camera_id', cameraId)
        .eq('axis', axis)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      setRows((data ?? []) as unknown as PreflightRunRow[]);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [cameraId, axis, limit]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory, refreshKey]);

  if (!cameraId) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-t pt-2 mt-1">
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] gap-1"
            data-testid={`ptz-preflight-history-toggle-${axis}`}
          >
            <History className="w-3 h-3" />
            Histórico de validações{' '}
            {rows.length > 0 && <span className="text-muted-foreground">({rows.length})</span>}
          </Button>
        </CollapsibleTrigger>
        {open && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => void fetchHistory()}
            disabled={loading}
          >
            {loading ? 'Carregando…' : 'Atualizar'}
          </Button>
        )}
      </div>

      <CollapsibleContent className="mt-2 space-y-1.5">
        {rows.length === 0 && !loading && (
          <p className="text-[11px] text-muted-foreground italic px-1">
            Nenhuma execução registrada para este eixo.
          </p>
        )}
        {rows.map((r) => {
          const bothAcked = r.ack_area_clear && r.ack_watching_live;
          return (
            <div
              key={r.id}
              className="rounded border bg-muted/20 p-2 text-[11px] space-y-1"
              data-testid={`ptz-preflight-history-row-${axis}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-muted-foreground">{fmtDate(r.created_at)}</span>
                <div className="flex items-center gap-1">
                  {outcomeBadge(r.outcome)}
                  {!r.status_supported && (
                    <Badge variant="outline" className="text-[9px]">
                      sem telemetria
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[10px]">
                <span
                  className={
                    r.ack_area_clear ? 'text-emerald-600 dark:text-emerald-500' : 'text-destructive'
                  }
                  title="Checklist: área do dome livre"
                >
                  {r.ack_area_clear ? '☑' : '☐'} área livre
                </span>
                <span
                  className={
                    r.ack_watching_live
                      ? 'text-emerald-600 dark:text-emerald-500'
                      : 'text-destructive'
                  }
                  title="Checklist: operador acompanhando ao vivo"
                >
                  {r.ack_watching_live ? '☑' : '☐'} vendo ao vivo
                </span>
                {bothAcked && r.ack_confirmed_at && (
                  <span className="text-muted-foreground font-mono flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    confirmado {fmtDate(r.ack_confirmed_at)}
                  </span>
                )}
                <span className="text-muted-foreground">
                  {r.phases.length} fase{r.phases.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}
