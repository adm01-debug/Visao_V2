import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle2, RefreshCcw, Siren } from 'lucide-react';
import { toast } from 'sonner';

interface ConsecutiveProblem {
  jobname: string;
  consecutive_failures: number;
  last_reason: string | null;
  last_seen_at: string;
}

const THRESHOLD = 3;

export function CronWatchdogEscalationCard() {
  const [rows, setRows] = useState<ConsecutiveProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [escalating, setEscalating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('cron_watchdog_consecutive_problems', {
      _min_runs: THRESHOLD,
    });
    if (error) {
      toast.error('Falha ao carregar status de escalação');
    } else {
      setRows((data ?? []) as unknown as ConsecutiveProblem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const escalateNow = async () => {
    setEscalating(true);
    const { data, error } = await supabase.functions.invoke('cron-watchdog-escalate', { body: {} });
    setEscalating(false);
    if (error) {
      toast.error('Escalação manual falhou');
      return;
    }
    toast.success(`Escalação executada: ${data?.escalated ?? 0} job(s) crítico(s)`);
    load();
  };

  const critical = rows.length > 0;

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
              Jobs com {THRESHOLD}+ execuções consecutivas do watchdog reportando falhas. Alertas escalados a cada 30min.
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
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : rows.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Nenhum job em estado crítico. Todos os agendamentos estão saudáveis.
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {rows.map((row) => (
                <div key={row.jobname} className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="font-mono text-sm font-medium">{row.jobname}</span>
                    </div>
                    <Badge variant="destructive">{row.consecutive_failures}x consecutivas</Badge>
                  </div>
                  {row.last_reason && (
                    <p className="mt-1 text-xs text-muted-foreground">{row.last_reason}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Última observação: {new Date(row.last_seen_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
