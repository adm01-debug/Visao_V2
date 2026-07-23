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

const THRESHOLD = 3;

export function CronWatchdogEscalationCard() {
  const [agg, setAgg] = useState<Aggregate | null>(null);
  const [history, setHistory] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [escalating, setEscalating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [rpcRes, histRes] = await Promise.all([
      supabase.rpc('cron_watchdog_consecutive_problems', { _min_runs: THRESHOLD }),
      supabase
        .from('cron_watchdog_escalations')
        .select('id, escalated_at, jobname, consecutive_failures, last_reason, delivered, delivery_error')
        .order('escalated_at', { ascending: false })
        .limit(15),
    ]);
    if (rpcRes.error) toast.error('Falha ao consultar status de escalação');
    else {
      const row = Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data;
      setAgg((row ?? null) as unknown as Aggregate | null);
    }
    if (histRes.error) toast.error('Falha ao carregar histórico');
    else setHistory((histRes.data ?? []) as unknown as Escalation[]);
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
                      <div key={h.id} className="flex items-center justify-between rounded border p-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{h.jobname}</span>
                          <Badge variant={h.delivered ? 'default' : 'destructive'} className="text-[10px]">
                            {h.consecutive_failures}x
                          </Badge>
                        </div>
                        <div className="text-muted-foreground">
                          {new Date(h.escalated_at).toLocaleString('pt-BR')}
                          {!h.delivered && h.delivery_error && (
                            <span className="ml-2 text-destructive">({h.delivery_error})</span>
                          )}
                        </div>
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
