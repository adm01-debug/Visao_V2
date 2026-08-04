import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface CronJob {
  jobid: number;
  jobname: string;
  schedule: string;
  active: boolean;
  last_run: string | null;
  last_status: string | null;
  last_message: string | null;
  failure_count_24h: number;
  success_count_24h: number;
}

const DEFAULT_JOB = 'connectivity-resolution-alert-hourly';

export function CronJobRunsCard() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [jobName, setJobName] = useState(DEFAULT_JOB);
  const [runs, setRuns] = useState<CronRun[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = async () => {
    setLoadingJobs(true);
    const { data, error } = await supabase.rpc('list_cron_jobs');
    if (!error && data) {
      const list = data as CronJob[];
      setJobs(list);
      if (list.length > 0 && !list.some((j) => j.jobname === jobName)) {
        setJobName(list[0]!.jobname);
      }
    }
    setLoadingJobs(false);
  };

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
    void loadJobs();
  }, []);

  useEffect(() => {
    if (jobName) void load(jobName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobName]);

  const failed = runs.filter((r) => (r.status ?? '').toLowerCase() === 'failed').length;
  const failingJobs = useMemo(() => jobs.filter((j) => j.failure_count_24h > 0), [jobs]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Agendador (pg_cron)
            </CardTitle>
            <CardDescription>
              Selecione um job para inspecionar as últimas 20 execuções. Apenas administradores.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void loadJobs();
                void load(jobName);
              }}
              disabled={loading || loadingJobs}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading || loadingJobs ? 'animate-spin' : ''}`}
              />
              Atualizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {failingJobs.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{failingJobs.length} job(s) com falhas nas últimas 24h</AlertTitle>
            <AlertDescription className="text-xs">
              {failingJobs
                .slice(0, 5)
                .map((j) => `${j.jobname} (${j.failure_count_24h})`)
                .join(' · ')}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div>
            <Label className="text-xs text-muted-foreground">Job</Label>
            {jobs.length > 0 ? (
              <Select value={jobName} onValueChange={setJobName}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um job" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((j) => (
                    <SelectItem key={j.jobid} value={j.jobname}>
                      <span className="flex items-center gap-2">
                        {j.failure_count_24h > 0 && (
                          <Badge variant="destructive" className="h-5 px-1 text-[10px]">
                            {j.failure_count_24h}
                          </Badge>
                        )}
                        {!j.active && (
                          <Badge variant="secondary" className="h-5 px-1 text-[10px]">
                            inativo
                          </Badge>
                        )}
                        {j.jobname}
                        <span className="text-xs text-muted-foreground">({j.schedule})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                placeholder={DEFAULT_JOB}
              />
            )}
          </div>
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
            <AlertTitle>{failed} execução(ões) com falha entre as últimas 20</AlertTitle>
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
            Nenhuma execução encontrada para o job selecionado.
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
              const duration = run.end_time
                ? Math.max(0, new Date(run.end_time).getTime() - new Date(run.start_time).getTime())
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
