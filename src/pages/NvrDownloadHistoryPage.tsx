/**
 * VISÃO — Histórico e diagnóstico de downloads de gravações NVR.
 *
 * Agrega jobs de `nvr_recording_downloads` por câmera, com filtros
 * por intervalo, NVR e status. Métricas: total, sucesso, falha,
 * cancelados, taxa de sucesso, bytes baixados, duração média/p95,
 * tentativas médias e top erros para depurar falhas recorrentes.
 */
import { useEffect, useMemo, useState } from 'react';
import { format, subDays, differenceInSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarIcon,
  CheckCircle2,
  Download,
  History,
  Loader2,
  RefreshCw,
  Timer,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { supabase } from '@/integrations/supabase/client';
import { useCameras } from '@/hooks/useCameras';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { PageMeta } from '@/components/PageMeta';
import { PageContent } from '@/components/layout/MainLayout';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

type JobRow = {
  id: string;
  nvr_id: string;
  channel: number;
  status: string;
  bytes_downloaded: number | null;
  total_bytes: number | null;
  attempts: number | null;
  last_error: string | null;
  start_time: string;
  end_time: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type NvrLite = { id: string; name: string };

function fmtBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`;
}

function fmtDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx] ?? 0;
}

type CameraGroup = {
  cameraId: string | null;
  cameraName: string;
  nvrName: string;
  channel: number;
  jobs: JobRow[];
  total: number;
  completed: number;
  failed: number;
  canceled: number;
  inflight: number;
  successRate: number;
  bytes: number;
  avgDurationSec: number;
  p95DurationSec: number;
  avgAttempts: number;
  topErrors: Array<{ message: string; count: number }>;
  lastJobAt: string | null;
};

export default function NvrDownloadHistoryPage() {
  const { cameras, loading: camerasLoading } = useCameras();
  const [nvrs, setNvrs] = useState<NvrLite[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [fromDate, setFromDate] = useState<Date>(subDays(new Date(), 7));
  const [toDate, setToDate] = useState<Date>(new Date());
  const [nvrFilter, setNvrFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    void supabase
      .from('nvrs')
      .select('id, name')
      .then(({ data }) => setNvrs((data ?? []) as NvrLite[]));
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);

      let query = supabase
        .from('nvr_recording_downloads')
        .select(
          'id, nvr_id, channel, status, bytes_downloaded, total_bytes, attempts, last_error, start_time, end_time, started_at, completed_at, created_at'
        )
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .order('created_at', { ascending: false })
        .limit(1000);

      if (nvrFilter !== 'all') query = query.eq('nvr_id', nvrFilter);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);

      const { data, error } = await query;
      if (error) throw error;
      setJobs((data ?? []) as JobRow[]);
    } catch (e) {
      toast.error('Falha ao carregar histórico de downloads.');
      if (import.meta.env.DEV) logger.error('[nvr-history] falha', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, nvrFilter, statusFilter]);

  const cameraByChannel = useMemo(() => {
    const map = new Map<string, { id: string; name: string; nvr_id: string | null }>();
    for (const c of cameras) {
      const key = `${c.nvr_id ?? 'none'}#${c.channel_number ?? 0}`;
      map.set(key, { id: c.id, name: c.name, nvr_id: c.nvr_id ?? null });
    }
    return map;
  }, [cameras]);

  const nvrById = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of nvrs) map.set(n.id, n.name);
    return map;
  }, [nvrs]);

  const groups: CameraGroup[] = useMemo(() => {
    const acc = new Map<string, JobRow[]>();
    for (const j of jobs) {
      const key = `${j.nvr_id}#${j.channel}`;
      const bucket = acc.get(key);
      if (bucket) bucket.push(j);
      else acc.set(key, [j]);
    }

    const result: CameraGroup[] = [];
    for (const [key, list] of acc.entries()) {
      const [nvrId, chStr] = key.split('#');
      const channel = Number(chStr);
      const cam = cameraByChannel.get(`${nvrId}#${channel}`);
      const durations: number[] = [];
      let bytes = 0;
      let attempts = 0;
      let completed = 0;
      let failed = 0;
      let canceled = 0;
      let inflight = 0;
      const errorTally = new Map<string, number>();
      let lastAt: string | null = null;

      for (const j of list) {
        bytes += Number(j.bytes_downloaded ?? 0);
        attempts += Number(j.attempts ?? 0);
        if (j.status === 'completed') completed += 1;
        else if (j.status === 'failed') failed += 1;
        else if (j.status === 'canceled') canceled += 1;
        else inflight += 1;

        if (j.started_at && j.completed_at) {
          const d = differenceInSeconds(new Date(j.completed_at), new Date(j.started_at));
          if (d > 0 && d < 24 * 3600) durations.push(d);
        }
        if (j.last_error) {
          const errKey = j.last_error.slice(0, 160);
          errorTally.set(errKey, (errorTally.get(errKey) ?? 0) + 1);
        }
        if (!lastAt || new Date(j.created_at) > new Date(lastAt)) lastAt = j.created_at;
      }

      const decided = completed + failed + canceled;
      const successRate = decided === 0 ? 0 : (completed / decided) * 100;
      const avgDur = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
      const p95Dur = percentile(durations, 95);

      const topErrors = Array.from(errorTally.entries())
        .map(([message, count]) => ({ message, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      result.push({
        cameraId: cam?.id ?? null,
        cameraName: cam?.name ?? `Canal ${channel}`,
        nvrName: nvrById.get(nvrId ?? '') ?? 'NVR desconhecido',
        channel,
        jobs: list,
        total: list.length,
        completed,
        failed,
        canceled,
        inflight,
        successRate,
        bytes,
        avgDurationSec: avgDur,
        p95DurationSec: p95Dur,
        avgAttempts: list.length ? attempts / list.length : 0,
        topErrors,
        lastJobAt: lastAt,
      });
    }

    return result.sort((a, b) => {
      // Prioriza depuração: câmeras com mais falhas primeiro
      if (b.failed !== a.failed) return b.failed - a.failed;
      return b.total - a.total;
    });
  }, [jobs, cameraByChannel, nvrById]);

  const totals = useMemo(() => {
    const t = { total: 0, completed: 0, failed: 0, canceled: 0, bytes: 0 };
    for (const g of groups) {
      t.total += g.total;
      t.completed += g.completed;
      t.failed += g.failed;
      t.canceled += g.canceled;
      t.bytes += g.bytes;
    }
    const decided = t.completed + t.failed + t.canceled;
    const rate = decided === 0 ? 0 : (t.completed / decided) * 100;
    return { ...t, successRate: rate };
  }, [groups]);

  return (
    <>
      <PageMeta
        title="Histórico de Downloads NVR | VISÃO"
        description="Diagnóstico de downloads de gravações por câmera com taxa de sucesso, duração, tamanho e erros recorrentes."
      />
      <PageContent>
        <div className="space-y-6">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
                <History className="h-6 w-6 text-primary" aria-hidden />
                Histórico de Downloads
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Diagnóstico por câmera e intervalo — tamanho baixado, duração, tentativas, taxa de
                sucesso e erros recorrentes.
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/playback/downloads">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Voltar para Downloads
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadJobs()}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 h-4 w-4" />
                )}
                Atualizar
              </Button>
            </div>
          </header>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filtros</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <DatePickerField label="De" date={fromDate} onChange={(d) => d && setFromDate(d)} />
              <DatePickerField label="Até" date={toDate} onChange={(d) => d && setToDate(d)} />
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">NVR</label>
                <Select value={nvrFilter} onValueChange={setNvrFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os NVRs</SelectItem>
                    {nvrs.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="completed">Concluídos</SelectItem>
                    <SelectItem value="failed">Falhas</SelectItem>
                    <SelectItem value="canceled">Cancelados</SelectItem>
                    <SelectItem value="in_progress">Em andamento</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <SummaryTile
              label="Jobs"
              value={String(totals.total)}
              icon={<Download className="h-4 w-4" />}
            />
            <SummaryTile
              label="Sucesso"
              value={`${totals.successRate.toFixed(1)}%`}
              tone="success"
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <SummaryTile
              label="Falhas"
              value={String(totals.failed)}
              tone={totals.failed > 0 ? 'danger' : undefined}
              icon={<XCircle className="h-4 w-4" />}
            />
            <SummaryTile
              label="Cancelados"
              value={String(totals.canceled)}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
            <SummaryTile
              label="Total baixado"
              value={fmtBytes(totals.bytes)}
              icon={<Timer className="h-4 w-4" />}
            />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Por câmera ({groups.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading || camerasLoading ? (
                <div className="space-y-2 p-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : groups.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  Nenhum download no intervalo selecionado.
                </div>
              ) : (
                <ScrollArea className="max-h-[70vh]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/60 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="p-3 text-left">Câmera</th>
                        <th className="p-3 text-left">Jobs</th>
                        <th className="p-3 text-left">Taxa de sucesso</th>
                        <th className="p-3 text-right">Baixado</th>
                        <th className="p-3 text-right">Duração (média · p95)</th>
                        <th className="p-3 text-right">Tentativas médias</th>
                        <th className="p-3 text-left">Top erros</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((g) => (
                        <tr
                          key={`${g.nvrName}-${g.channel}`}
                          className="border-t border-border align-top"
                        >
                          <td className="p-3">
                            <div className="font-medium text-foreground">{g.cameraName}</div>
                            <div className="text-xs text-muted-foreground">
                              {g.nvrName} · canal {g.channel}
                            </div>
                            {g.lastJobAt && (
                              <div className="mt-0.5 text-[11px] text-muted-foreground">
                                Último:{' '}
                                {format(new Date(g.lastJobAt), 'dd/MM HH:mm', { locale: ptBR })}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="outline">{g.total} total</Badge>
                              {g.completed > 0 && (
                                <Badge className="bg-success/15 text-success" variant="outline">
                                  {g.completed} ok
                                </Badge>
                              )}
                              {g.failed > 0 && (
                                <Badge variant="destructive">{g.failed} falha</Badge>
                              )}
                              {g.canceled > 0 && (
                                <Badge variant="secondary">{g.canceled} cancel</Badge>
                              )}
                              {g.inflight > 0 && (
                                <Badge variant="outline">{g.inflight} ativo</Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-3 min-w-[160px]">
                            <div
                              className={cn(
                                'text-sm font-semibold',
                                g.successRate >= 90
                                  ? 'text-success'
                                  : g.successRate >= 60
                                    ? 'text-warning'
                                    : 'text-destructive'
                              )}
                            >
                              {g.successRate.toFixed(1)}%
                            </div>
                            <Progress value={g.successRate} className="mt-1 h-1.5" />
                          </td>
                          <td className="p-3 text-right text-foreground/90">{fmtBytes(g.bytes)}</td>
                          <td className="p-3 text-right text-foreground/90">
                            {fmtDuration(g.avgDurationSec)}
                            <div className="text-[11px] text-muted-foreground">
                              p95 {fmtDuration(g.p95DurationSec)}
                            </div>
                          </td>
                          <td className="p-3 text-right text-foreground/90">
                            {g.avgAttempts.toFixed(1)}
                          </td>
                          <td className="p-3">
                            {g.topErrors.length === 0 ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              <ul className="space-y-1">
                                {g.topErrors.map((e, i) => (
                                  <li
                                    key={i}
                                    className="max-w-[22rem] truncate text-xs text-destructive"
                                    title={e.message}
                                  >
                                    <span className="mr-1 font-semibold">×{e.count}</span>
                                    {e.message}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </>
  );
}

function DatePickerField({
  label,
  date,
  onChange,
}: {
  label: string;
  date: Date;
  onChange: (d: Date | undefined) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(date, 'PPP', { locale: ptBR })}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onChange}
            autoFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: 'success' | 'danger';
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground',
            tone === 'success' && 'bg-success/15 text-success',
            tone === 'danger' && 'bg-destructive/15 text-destructive'
          )}
        >
          {icon}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold text-foreground">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
