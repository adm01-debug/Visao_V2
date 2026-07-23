import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CronRun {
  runid: number;
  jobid: number;
  status: string | null;
  return_message: string | null;
  start_time: string;
  end_time: string | null;
}

const DEFAULT_JOB = 'connectivity-resolution-alert-hourly';

export function CronJobRunsCard() {
  const [jobName, setJobName] = useState(DEFAULT_JOB);
  const [runs, setRuns] = useState<CronRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (name: string) => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc('get_cron_job_runs', {
      p_job_name: name,
      p_limit: 20,
    });
    if (error) {
      setError(error.message ?? 'Falha ao carregar execuções');
      setRuns([]);
    } else {
      setRuns((data ?? []) as CronRun[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load(DEFAULT_JOB);
  }, []);

  const failed = runs.filter((r) => (r.status ?? '').toLowerCase() === 'failed').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Execuções do agendador (pg_cron)
            </CardTitle>
            <CardDescription>
              Últimas 20 execuções do job. Apenas administradores têm acesso.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load(jobName)}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[240px]">
            <Label htmlFor="cron-job-name" className="text-xs text-muted-foreground">
              Nome do job (cron.job.jobname)
            </Label>
            <Input
              id="cron-job-name"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void load(jobName);
              }}
              placeholder={DEFAULT_JOB}
            />
          </div>
          <Button onClick={() => void load(jobName)} disabled={loading || !jobName.trim()}>
            Consultar
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {failed > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{failed} execução(ões) com falha</AlertTitle>
            <AlertDescription>
              Verifique as mensagens abaixo para diagnosticar o problema.
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma execução encontrada para o job informado.
          </p>
        ) : (
          <div className="divide-y rounded-md border">
            {runs.map((run) => {
              const status = (run.status ?? 'unknown').toLowerCase();
              const variant =
                status === 'succeeded'
                  ? 'default'
                  : status === 'failed'
                    ? 'destructive'
                    : 'secondary';
              const duration =
                run.end_time
                  ? Math.max(
                      0,
                      new Date(run.end_time).getTime() - new Date(run.start_time).getTime(),
                    )
                  : null;
              return (
                <div key={run.runid} className="flex flex-col gap-1 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={variant}>{run.status ?? 'unknown'}</Badge>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(run.start_time), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    {duration !== null && (
                      <span className="text-xs text-muted-foreground">
                        {(duration / 1000).toFixed(2)}s
                      </span>
                    )}
                  </div>
                  {run.return_message && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {run.return_message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CronJobRunsCard;
