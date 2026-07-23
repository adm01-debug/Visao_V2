import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle2, RefreshCcw, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface WatchdogRun {
  id: string;
  ran_at: string;
  jobs_total: number;
  problems: number;
  alerts_sent: number;
  dedup_skipped: number;
  delivered: boolean;
  delivery_error: string | null;
  min_failures: number;
  stale_minutes: number;
  details: Array<{ jobname: string; reason: string; last_status: string | null; failure_count_24h: number }>;
}

export function CronWatchdogRunsCard() {
  const [runs, setRuns] = useState<WatchdogRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cron_watchdog_runs')
      .select('*')
      .order('ran_at', { ascending: false })
      .limit(20);
    if (error) {
      toast.error('Falha ao carregar execuções do watchdog');
    } else {
      setRuns((data ?? []) as unknown as WatchdogRun[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const runNow = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke('cron-watchdog', { body: {} });
    setRunning(false);
    if (error) {
      toast.error('Execução manual falhou');
      return;
    }
    toast.success(`Watchdog executado: ${data?.problems ?? 0} problema(s)`);
    load();
  };

  const last = runs[0];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Watchdog do Agendador
          </CardTitle>
          <CardDescription>
            Últimas 20 execuções do vigia de jobs pg_cron
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={runNow} disabled={running}>
          <RefreshCcw className={`h-4 w-4 mr-2 ${running ? 'animate-spin' : ''}`} />
          Executar agora
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {last && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="rounded-lg border p-3">
              <div className="text-muted-foreground text-xs">Jobs</div>
              <div className="text-2xl font-bold">{last.jobs_total}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-muted-foreground text-xs">Problemas</div>
              <div className={`text-2xl font-bold ${last.problems > 0 ? 'text-destructive' : 'text-green-600'}`}>
                {last.problems}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-muted-foreground text-xs">Alertas enviados</div>
              <div className="text-2xl font-bold">{last.alerts_sent}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-muted-foreground text-xs">Dedup ignorados</div>
              <div className="text-2xl font-bold">{last.dedup_skipped}</div>
            </div>
          </div>
        )}

        <ScrollArea className="h-[360px]">
          <div className="space-y-2 pr-3">
            {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
            {!loading && runs.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma execução registrada ainda.</p>
            )}
            {runs.map((r) => (
              <div key={r.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-sm">
                    {r.problems > 0 ? (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                    <span className="font-medium">
                      {formatDistanceToNow(new Date(r.ran_at), { addSuffix: true, locale: ptBR })}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      · {r.jobs_total} jobs · min falhas {r.min_failures} · stale {r.stale_minutes}min
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {r.problems > 0 && (
                      <Badge variant="destructive">{r.problems} problema(s)</Badge>
                    )}
                    {r.alerts_sent > 0 && (
                      <Badge variant={r.delivered ? 'default' : 'secondary'}>
                        {r.delivered ? '📨 entregue' : '⚠️ não entregue'}
                      </Badge>
                    )}
                    {r.delivery_error && (
                      <Badge variant="outline" className="text-destructive border-destructive">
                        {r.delivery_error}
                      </Badge>
                    )}
                  </div>
                </div>
                {r.details.length > 0 && (
                  <ul className="text-xs text-muted-foreground space-y-1 pl-6 list-disc">
                    {r.details.map((d, i) => (
                      <li key={i}>
                        <span className="font-mono text-foreground">{d.jobname}</span> — {d.reason}
                        {d.last_status && ` (status: ${d.last_status})`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
