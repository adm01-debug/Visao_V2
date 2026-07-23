import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle2, RefreshCcw, Siren } from 'lucide-react';
import { toast } from 'sonner';

interface Aggregate {
  consecutive_problem_runs: number;
  last_run_at: string | null;
  total_problems: number;
  distinct_jobs: number;
  jobnames: string[];
}

interface Escalation {
  id: string;
  escalated_at: string;
  jobname: string;
  consecutive_failures: number;
  last_reason: string | null;
  delivered: boolean;
  delivery_error: string | null;
  acknowledged_at: string | null;
  acknowledgement_note: string | null;
}

interface AckMetric {
  window_label: string;
  total_escalations: number;
  acknowledged: number;
  open: number;
  ack_rate: number | null;
  mtta_seconds: number | null;
  p95_ack_seconds: number | null;
}

const THRESHOLD = 3;

const fmtDuration = (s: number | null): string => {
  if (s == null) return '—';
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${(s / 60).toFixed(1)}min`;
  return `${(s / 3600).toFixed(1)}h`;
};

export function CronWatchdogEscalationCard() {
  const [agg, setAgg] = useState<Aggregate | null>(null);
  const [history, setHistory] = useState<Escalation[]>([]);
  const [metrics, setMetrics] = useState<AckMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [escalating, setEscalating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [rpcRes, histRes, metricsRes] = await Promise.all([
      supabase.rpc('cron_watchdog_consecutive_problems', { _min_runs: THRESHOLD }),
      supabase
        .from('cron_watchdog_escalations')
        .select('id, escalated_at, jobname, consecutive_failures, last_reason, delivered, delivery_error, acknowledged_at, acknowledgement_note')
        .order('escalated_at', { ascending: false })
        .limit(15),
      supabase.rpc('cron_watchdog_ack_metrics'),
    ]);
    if (rpcRes.error) toast.error('Falha ao consultar status de escalação');
    else {
      const row = Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data;
      setAgg((row ?? null) as unknown as Aggregate | null);
    }
    if (histRes.error) toast.error('Falha ao carregar histórico');
    else setHistory((histRes.data ?? []) as unknown as Escalation[]);
    if (!metricsRes.error) setMetrics((metricsRes.data ?? []) as unknown as AckMetric[]);
    setLoading(false);
  };


  useEffect(() => {
    load();
  }, []);

  const escalateNow = async () => {
    setEscalating(true);
    const { data, error } = await supabase.functions.invoke('cron-watchdog-escalate', {
      body: { force: true },
    });
    setEscalating(false);
    if (error) {
      toast.error('Escalação manual falhou');
      return;
    }
    toast.success(data?.escalated ? 'Escalação enviada' : 'Nenhuma condição crítica no momento');
    load();
  };

  const critical = (agg?.consecutive_problem_runs ?? 0) >= THRESHOLD;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Siren className={critical ? 'h-5 w-5 text-destructive' : 'h-5 w-5 text-muted-foreground'} />
              Escalação do Watchdog
            </CardTitle>
            <CardDescription>
              Dispara alerta crítico quando o watchdog reporta falhas em {THRESHOLD}+ execuções consecutivas (dedup 2h).
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button size="sm" variant={critical ? 'destructive' : 'outline'} onClick={escalateNow} disabled={escalating}>
              {escalating ? 'Escalando...' : 'Escalar agora'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Execuções consecutivas com falha</p>
                <p className={`text-2xl font-bold ${critical ? 'text-destructive' : ''}`}>
                  {agg?.consecutive_problem_runs ?? 0}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Problemas acumulados</p>
                <p className="text-2xl font-bold">{agg?.total_problems ?? 0}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Jobs distintos afetados</p>
                <p className="text-2xl font-bold">{agg?.distinct_jobs ?? 0}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Última execução</p>
                <p className="text-sm font-medium">
                  {agg?.last_run_at ? new Date(agg.last_run_at).toLocaleString('pt-BR') : '—'}
                </p>
              </div>
            </div>

            {(agg?.jobnames?.length ?? 0) > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-xs font-medium text-destructive mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Jobs em estado crítico
                </p>
                <div className="flex flex-wrap gap-1">
                  {agg!.jobnames.map((j) => (
                    <Badge key={j} variant="destructive" className="font-mono text-xs">{j}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Histórico de escalações (últimas 15)</p>
              {history.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Nenhuma escalação registrada.
                </div>
              ) : (
                <ScrollArea className="h-48">
                  <div className="space-y-1">
                    {history.map((h) => (
                      <div key={h.id} className={`rounded border p-2 text-xs ${h.acknowledged_at ? 'opacity-60' : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{h.jobname}</span>
                            <Badge variant={h.delivered ? 'default' : 'destructive'} className="text-[10px]">
                              {h.consecutive_failures}x
                            </Badge>
                            {h.acknowledged_at && (
                              <Badge variant="outline" className="text-[10px]">ACK</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span>{new Date(h.escalated_at).toLocaleString('pt-BR')}</span>
                            {!h.delivered && h.delivery_error && (
                              <span className="text-destructive">({h.delivery_error})</span>
                            )}
                            {!h.acknowledged_at && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[10px]"
                                onClick={async () => {
                                  const note = window.prompt('Nota do ACK (opcional):') ?? '';
                                  const { error } = await supabase
                                    .from('cron_watchdog_escalations')
                                    .update({ acknowledged_at: new Date().toISOString(), acknowledgement_note: note || null })
                                    .eq('id', h.id);
                                  if (error) toast.error('Falha ao registrar ACK');
                                  else { toast.success('Escalação reconhecida'); load(); }
                                }}
                              >
                                ACK
                              </Button>
                            )}
                          </div>
                        </div>
                        {h.acknowledgement_note && (
                          <p className="mt-1 text-[11px] text-muted-foreground italic">"{h.acknowledgement_note}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
